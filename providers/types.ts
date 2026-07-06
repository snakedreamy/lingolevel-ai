export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ProviderChatInput {
  messages: ChatMessage[]
  systemInstruction: string
  temperature?: number
  scenarioId?: string | null
}

export interface ProviderChatOutput {
  /** True when the provider failed and a hard-coded fallback reply was returned. */
  content: string
  isFallback?: boolean
}

export interface ProviderAnalyzeInput {
  userMessage: string
  assistantMessage: string
  level: string
}

export interface ProviderAnalyzeOutput {
  /** The parsed analysis payload (or a fallback `AnalysisResult`). */
  data: unknown
  /** True when the provider failed and the hard-coded fallback was returned. */
  isFallback: boolean
}

export interface Provider {
  chat(input: ProviderChatInput): Promise<ProviderChatOutput>
  analyzeJSON(input: ProviderAnalyzeInput): Promise<ProviderAnalyzeOutput>
}

export interface ProviderConfig {
  apiKey: string
  baseUrl: string
  chatModel: string
  analyzeModel: string
  timeoutMs: number
}
