import { resolveProxyDispatcher } from '../proxy'
import { createMimoTtsProvider } from './mimo'
import type { TtsLanguage, TtsProvider } from './types'

export type { TtsLanguage, TtsProvider, TtsSynthesisInput, TtsSynthesisOutput } from './types'

export interface TtsRuntime {
  provider: TtsProvider | null
  maxTextChars: number
}

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name] ?? String(fallback)
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer (got "${raw}")`)
  }
  return value
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required when TTS_PROVIDER=mimo`)
  return value
}

export function loadTtsFromEnv(): TtsRuntime {
  const providerId = (process.env.TTS_PROVIDER ?? 'none').trim().toLowerCase()
  const maxTextChars = readPositiveInteger('TTS_MAX_TEXT_CHARS', 5000)
  if (!providerId || providerId === 'none') return { provider: null, maxTextChars }
  if (providerId !== 'mimo') {
    throw new Error(`TTS_PROVIDER must be "none" or "mimo" (got "${providerId}")`)
  }

  const apiKey = requiredEnv('MIMO_TTS_API_KEY')
  const baseUrl = (process.env.MIMO_TTS_BASE_URL ?? 'https://api.xiaomimimo.com/v1').trim()
  const model = (process.env.MIMO_TTS_MODEL ?? 'mimo-v2.5-tts').trim()
  const proxyUrl = process.env.MIMO_TTS_PROXY?.trim() || undefined
  new URL(baseUrl)
  if (!model) throw new Error('MIMO_TTS_MODEL must not be empty')
  if (proxyUrl) resolveProxyDispatcher(proxyUrl)

  const voices: Record<TtsLanguage, string> = {
    'zh-CN': (process.env.MIMO_TTS_VOICE_ZH ?? '冰糖').trim(),
    'en-US': (process.env.MIMO_TTS_VOICE_EN_US ?? 'Mia').trim(),
    'en-GB': (process.env.MIMO_TTS_VOICE_EN_GB ?? 'Mia').trim(),
  }
  for (const [language, voice] of Object.entries(voices)) {
    if (!voice) throw new Error(`MiMo TTS voice for ${language} must not be empty`)
  }

  return {
    provider: createMimoTtsProvider({
      apiKey,
      baseUrl,
      model,
      voices,
      timeoutMs: readPositiveInteger('TTS_TIMEOUT_MS', 30_000),
      proxyUrl,
    }),
    maxTextChars,
  }
}
