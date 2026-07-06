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
  maxContextMessages: number
}

/**
 * Internal helper: read and validate the 4 provider-specific env vars plus
 * PROVIDER and REQUEST_TIMEOUT_MS.
 *
 * @throws if PROVIDER is missing/invalid, any required env var is empty, or
 *   REQUEST_TIMEOUT_MS is not a positive finite number.
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

  const timeoutRaw = Number(process.env.REQUEST_TIMEOUT_MS ?? '30000')
  if (!Number.isFinite(timeoutRaw) || timeoutRaw <= 0) {
    throw new Error(
      `REQUEST_TIMEOUT_MS must be a positive finite number (got "${process.env.REQUEST_TIMEOUT_MS ?? '30000'}")`
    )
  }

  const maxContextMessagesRaw = Number(process.env.MAX_CONTEXT_MESSAGES ?? '12')
  if (!Number.isInteger(maxContextMessagesRaw) || maxContextMessagesRaw <= 0) {
    throw new Error(
      `MAX_CONTEXT_MESSAGES must be a positive integer (got "${process.env.MAX_CONTEXT_MESSAGES ?? '12'}")`
    )
  }

  return {
    provider,
    apiKey,
    baseUrl,
    chatModel,
    analyzeModel,
    timeoutMs: timeoutRaw,
    maxContextMessages: maxContextMessagesRaw
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
    timeoutMs: env.timeoutMs
  })
}

export interface ServerConfig {
  provider: 'openai' | 'anthropic'
  chatModel: string
  analyzeModel: string
  baseUrl: string
  requestTimeoutMs: number
  maxContextMessages: number
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
    maxContextMessages: env.maxContextMessages
    // Deliberately NO apiKey, NO apiKeyPreview, NO keyHint, NO anything-key.
  }
}
