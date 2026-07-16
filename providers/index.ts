// providers/index.ts
import type { Provider, ProviderConfig } from './types'
import { createOpenAIProvider } from './openai-compatible'
import { createAnthropicProvider } from './anthropic'

export type {
  Provider,
  ChatMessage,
  ProviderChatInput,
  ProviderChatOutput,
  ProviderAnalyzeInput
} from './types'

export interface CreateProviderOptions extends ProviderConfig {
  provider: 'openai' | 'anthropic'
}

export function createProvider(opts: CreateProviderOptions): Provider {
  if (opts.provider === 'openai') return createOpenAIProvider(opts)
  if (opts.provider === 'anthropic') return createAnthropicProvider(opts)
  throw new Error(`Unknown PROVIDER: ${opts.provider}. Expected "openai" or "anthropic".`)
}

interface ResolvedProviderEnv {
  provider: 'openai' | 'anthropic'
  apiKey: string
  baseUrl: string
  chatModel: string
  analyzeModel: string
  timeoutMs: number
  maxOutputTokens: number
  maxContextMessages: number
  fillBlankBatchSize: number
  fillBlankAttempts: number
}

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name] ?? String(fallback)
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer (got "${raw}")`)
  }
  return value
}

/**
 * Internal helper: read and validate provider and generation environment
 * variables in one place.
 *
 * @throws if PROVIDER is missing/invalid, any required env var is empty, or
 *   a numeric setting is not a positive integer.
 */
function resolveProviderEnv(): ResolvedProviderEnv {
  const provider = (process.env.PROVIDER ?? '').toLowerCase()
  if (provider !== 'openai' && provider !== 'anthropic') {
    throw new Error(
      `PROVIDER must be "openai" or "anthropic" (got "${process.env.PROVIDER ?? ''}")`
    )
  }
  const isOpenAI: boolean = provider === 'openai'
  const apiKey = isOpenAI ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY
  const baseUrl = isOpenAI ? process.env.OPENAI_BASE_URL : process.env.ANTHROPIC_BASE_URL
  const chatModel = isOpenAI ? process.env.OPENAI_CHAT_MODEL : process.env.ANTHROPIC_CHAT_MODEL
  const analyzeModel = isOpenAI ? process.env.OPENAI_ANALYZE_MODEL : process.env.ANTHROPIC_ANALYZE_MODEL

  // Empty strings (e.g. KEY="") are treated as missing — `!apiKey` covers both
  // `undefined` and `''` and yields a helpful error naming the offending var.
  if (!apiKey) throw new Error(`${isOpenAI ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} is required`)
  if (!baseUrl) throw new Error(`${isOpenAI ? 'OPENAI_BASE_URL' : 'ANTHROPIC_BASE_URL'} is required`)
  const chatModelVar = isOpenAI ? 'OPENAI_CHAT_MODEL' : 'ANTHROPIC_CHAT_MODEL'
  const analyzeModelVar = isOpenAI ? 'OPENAI_ANALYZE_MODEL' : 'ANTHROPIC_ANALYZE_MODEL'
  if (!chatModel) throw new Error(`${chatModelVar} is required`)
  if (!analyzeModel) throw new Error(`${analyzeModelVar} is required`)
  if (chatModel.startsWith('your-')) {
    throw new Error(`${chatModelVar} must be set to a real model id, not the .env.example placeholder`)
  }
  if (analyzeModel.startsWith('your-')) {
    throw new Error(`${analyzeModelVar} must be set to a real model id, not the .env.example placeholder`)
  }

  const timeoutRaw = readPositiveInteger('REQUEST_TIMEOUT_MS', 180_000)
  const maxOutputTokens = readPositiveInteger('MAX_OUTPUT_TOKENS', 32_768)
  const maxContextMessagesRaw = readPositiveInteger('MAX_CONTEXT_MESSAGES', 12)
  const fillBlankBatchSize = readPositiveInteger('FILL_BLANK_BATCH_SIZE', 10)
  const fillBlankAttempts = readPositiveInteger('FILL_BLANK_ATTEMPTS', 2)

  return {
    provider,
    apiKey,
    baseUrl,
    chatModel,
    analyzeModel,
    timeoutMs: timeoutRaw,
    maxOutputTokens,
    maxContextMessages: maxContextMessagesRaw,
    fillBlankBatchSize,
    fillBlankAttempts,
  }
}

export function loadProviderFromEnv(): Provider {
  const env = resolveProviderEnv()
  return createProvider({
    provider: env.provider,
    apiKey: env.apiKey,
    baseUrl: env.baseUrl,
    chatModel: env.chatModel,
    analyzeModel: env.analyzeModel,
    timeoutMs: env.timeoutMs,
    maxOutputTokens: env.maxOutputTokens,
  })
}

export interface ServerConfig {
  provider: 'openai' | 'anthropic'
  chatModel: string
  analyzeModel: string
  baseUrl: string
  requestTimeoutMs: number
  maxOutputTokens: number
  maxContextMessages: number
  fillBlankBatchSize: number
  fillBlankAttempts: number
}

/**
 * Build the sanitized public server config from environment variables.
 *
 * @remarks
 * SECURITY: this function deliberately omits the API key. The returned object
 * is suitable for sending to the browser (e.g. as a `/api/config` endpoint
 * payload) so the client can display the active provider, model and base URL
 * without ever leaking secrets.
 *
 * NO apiKey. NO apiKeyPreview. NO keyHint. NO anything-key.
 *
 * Delegates to the same env validation as {@link loadProviderFromEnv}: an
 * invalid PROVIDER, missing required env var, or bad REQUEST_TIMEOUT_MS will
 * cause this function to throw — which surfaces to the client as a 5xx and
 * keeps the public config in lockstep with what the server actually uses.
 */
export function loadServerConfigFromEnv(): ServerConfig {
  const env = resolveProviderEnv()
  return {
    provider: env.provider,
    chatModel: env.chatModel,
    analyzeModel: env.analyzeModel,
    baseUrl: env.baseUrl,
    requestTimeoutMs: env.timeoutMs,
    maxOutputTokens: env.maxOutputTokens,
    maxContextMessages: env.maxContextMessages,
    fillBlankBatchSize: env.fillBlankBatchSize,
    fillBlankAttempts: env.fillBlankAttempts,
    // Deliberately NO apiKey, NO apiKeyPreview, NO keyHint, NO anything-key.
  }
}
