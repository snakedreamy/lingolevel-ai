import type { AnalysisResult, DifficultyLevel, ProviderId, Scenario } from "../types"

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

export interface ChatResponse {
  content: string
  timestamp: number
  isFallback?: boolean
}

export interface AnalyzeRequest {
  userMessage: string
  assistantMessage: string
  level: DifficultyLevel
}

export async function fetchServerConfig(): Promise<ServerConfig> {
  const response = await fetch("/api/server-config")
  if (!response.ok) {
    throw new Error("SERVER_CONFIG_UNAVAILABLE")
  }
  return (await response.json()) as ServerConfig
}

export async function sendChat(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error("CHAT_FAILED")
  }
  return (await response.json()) as ChatResponse
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
