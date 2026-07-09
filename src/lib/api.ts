import type { AnalysisResult, AskContext, DifficultyLevel, ProviderId, Scenario } from "../types"

export interface ServerConfig {
  provider: ProviderId
  chatModel: string
  analyzeModel: string
  baseUrl: string
  requestTimeoutMs: number
  maxContextMessages: number
}

export interface ChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>
  level: DifficultyLevel
  scenarioInfo: Scenario | null
}

export interface AnalyzeRequest {
  userMessage: string
  assistantMessage: string
  level: DifficultyLevel
  /** Scenario display name forwarded to the analysis prompt for context-aware suggestions. */
  scenarioContext?: string
}

export async function fetchServerConfig(): Promise<ServerConfig> {
  const response = await fetch("/api/server-config")
  if (!response.ok) {
    throw new Error("SERVER_CONFIG_UNAVAILABLE")
  }
  return (await response.json()) as ServerConfig
}

export async function sendAnalyze(request: AnalyzeRequest): Promise<AnalysisResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error("ANALYZE_FAILED")
  }
  return (await response.json()) as AnalysisResult
}

export interface SSEHandlers {
  onDelta: (delta: string) => void
  onDone: (payload: { isFallback?: boolean; timestamp?: number }) => void
  onError: (message: string) => void
}

/** Consume a server-sent-events stream from a POST endpoint. */
export async function streamSSE(url: string, body: unknown, handlers: SSEHandlers, signal?: AbortSignal): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    handlers.onError('REQUEST_FAILED')
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const dispatch = (evt: string) => {
    const line = evt.trim()
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data) return
    try {
      const parsed = JSON.parse(data) as { type: string; content?: string; isFallback?: boolean; timestamp?: number; message?: string }
      if (parsed.type === 'delta' && typeof parsed.content === 'string') handlers.onDelta(parsed.content)
      else if (parsed.type === 'done') handlers.onDone({ isFallback: parsed.isFallback, timestamp: parsed.timestamp })
      else if (parsed.type === 'error') handlers.onError(parsed.message ?? 'UNKNOWN_ERROR')
    } catch {
      /* ignore malformed line */
    }
  }
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const evt of events) dispatch(evt)
  }
  if (buffer.trim()) dispatch(buffer)
}

export function streamChat(body: ChatRequest, handlers: SSEHandlers, signal?: AbortSignal) {
  return streamSSE('/api/chat', body, handlers, signal)
}

export interface AskRequest {
  question: string
  level: DifficultyLevel
  context?: AskContext
}

export function streamAsk(body: AskRequest, handlers: SSEHandlers, signal?: AbortSignal) {
  return streamSSE('/api/ask', body, handlers, signal)
}
