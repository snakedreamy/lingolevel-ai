export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ProviderChatInput {
  messages: ChatMessage[]
  systemInstruction: string
  temperature?: number
  /** Maximum transport attempts; structured callers may own their own retry loop. */
  maxAttempts?: number
  scenarioId?: string | null
  /** Optional abort signal; the provider cancels the upstream fetch when aborted. */
  signal?: AbortSignal
}

export interface ProviderChatOutput {
  /** True when the provider failed and a hard-coded fallback reply was returned. */
  content: string
  isFallback?: boolean
}

export interface ProviderChatStreamOutput {
  /** Yields text deltas. On fallback, yields a single delta with the full fallback text. */
  stream: AsyncIterable<{ delta: string }>
  isFallback: boolean
}

export interface ProviderAnalyzeInput {
  userMessage: string
  assistantMessage: string
  level: string
  /** Optional scenario context injected into the analysis prompt (e.g. "Ordering Coffee at Starbucks"). */
  scenarioContext?: string
}

export interface ProviderAnalyzeOutput {
  /** The parsed analysis payload (or a fallback `AnalysisResult`). */
  data: unknown
  /** True when the provider failed and the hard-coded fallback was returned. */
  isFallback: boolean
}

export interface Provider {
  chat(input: ProviderChatInput): Promise<ProviderChatOutput>
  chatStream(input: ProviderChatInput): Promise<ProviderChatStreamOutput>
  analyzeJSON(input: ProviderAnalyzeInput): Promise<ProviderAnalyzeOutput>
}

export interface ProviderConfig {
  apiKey: string
  baseUrl: string
  chatModel: string
  analyzeModel: string
  timeoutMs: number
  maxOutputTokens: number
}
