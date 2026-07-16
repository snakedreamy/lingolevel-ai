import type { AnalysisResult, AskContext, DifficultyLevel, FillBlankCard, FillBlankFocus, ProviderId, Scenario } from "../types"

export interface ServerConfig {
  provider: ProviderId
  chatModel: string
  analyzeModel: string
  baseUrl: string
  requestTimeoutMs: number
  maxOutputTokens: number
  maxContextMessages: number
  fillBlankBatchSize: number
  fillBlankAttempts: number
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

export async function sendAnalyze(request: AnalyzeRequest, signal?: AbortSignal): Promise<AnalysisResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
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
    throw new Error('REQUEST_FAILED')
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let gotDone = false
  let terminalError: Error | null = null
  const dispatch = (evt: string) => {
    const line = evt.trim()
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data) return
    try {
      const parsed = JSON.parse(data) as { type: string; content?: string; isFallback?: boolean; timestamp?: number; message?: string }
      if (parsed.type === 'delta' && typeof parsed.content === 'string') handlers.onDelta(parsed.content)
      else if (parsed.type === 'done') {
        handlers.onDone({ isFallback: parsed.isFallback, timestamp: parsed.timestamp })
        gotDone = true
      }
      else if (parsed.type === 'error') {
        const message = parsed.message ?? 'UNKNOWN_ERROR'
        handlers.onError(message)
        terminalError = new Error(message)
      }
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
    if (terminalError) {
      await reader.cancel().catch(() => undefined)
      throw terminalError
    }
  }
  if (buffer.trim()) dispatch(buffer)
  if (terminalError) throw terminalError
  if (!gotDone) {
    handlers.onError('STREAM_CLOSED_UNEXPECTEDLY')
    throw new Error('STREAM_CLOSED_UNEXPECTEDLY')
  }
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

export interface GenerateFillBlankRequest {
  count: number
  level: DifficultyLevel
  focus: FillBlankFocus
  scenario?: Pick<Scenario, 'name' | 'englishName' | 'description'>
  recentSentences: string[]
}

export interface GenerateFillBlankResponse {
  cards: FillBlankCard[]
  isFallback?: boolean
  fallbackCount?: number
}

export async function generateFillBlank(
  request: GenerateFillBlankRequest,
  signal?: AbortSignal,
): Promise<GenerateFillBlankResponse> {
  const response = await fetch('/api/fill-blank', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
  if (!response.ok) throw new Error('FILL_BLANK_GENERATION_FAILED')
  return (await response.json()) as GenerateFillBlankResponse
}
