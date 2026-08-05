import { fetchViaProxy } from '../proxy'
import type { TtsLanguage, TtsProvider, TtsSynthesisInput, TtsSynthesisOutput } from './types'

export interface MimoTtsConfig {
  apiKey: string
  baseUrl: string
  model: string
  voices: Record<TtsLanguage, string>
  timeoutMs: number
  proxyUrl?: string
}

interface MimoTtsResponse {
  choices?: Array<{
    message?: {
      audio?: { data?: unknown }
    }
  }>
}

function styleInstruction(language: TtsLanguage, speed: number): string {
  const locale = language === 'zh-CN'
    ? '普通话中文'
    : language === 'en-US' ? '美式英语' : '英式英语'
  return `请使用自然、清晰的${locale}朗读，语速约为正常语速的 ${speed.toFixed(1)} 倍。`
}

function readAudioData(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  const response = value as MimoTtsResponse
  const data = response.choices?.[0]?.message?.audio?.data
  return typeof data === 'string' && data ? data : null
}

function decodeBase64Audio(data: string): Buffer | null {
  if (data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) return null
  return Buffer.from(data, 'base64')
}

function isWaveAudio(audio: Buffer): boolean {
  if (audio.length < 44
    || audio.subarray(0, 4).toString('ascii') !== 'RIFF'
    || audio.subarray(8, 12).toString('ascii') !== 'WAVE'
    || audio.readUInt32LE(4) + 8 !== audio.length) return false

  let hasFormat = false
  let hasData = false
  let offset = 12
  for (; offset + 8 <= audio.length;) {
    const chunkId = audio.subarray(offset, offset + 4).toString('ascii')
    const chunkSize = audio.readUInt32LE(offset + 4)
    const nextOffset = offset + 8 + chunkSize + (chunkSize % 2)
    if (nextOffset > audio.length) return false
    if (chunkId === 'fmt ' && chunkSize >= 16) hasFormat = true
    if (chunkId === 'data' && chunkSize > 0) hasData = true
    offset = nextOffset
  }
  return offset === audio.length && hasFormat && hasData
}

export function createMimoTtsProvider(cfg: MimoTtsConfig): TtsProvider {
  const endpoint = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`

  return {
    id: 'mimo',

    async synthesize(input: TtsSynthesisInput): Promise<TtsSynthesisOutput> {
      input.signal?.throwIfAborted()
      const timeoutController = new AbortController()
      const timeout = setTimeout(() => timeoutController.abort(), cfg.timeoutMs)
      const signal = input.signal
        ? AbortSignal.any([input.signal, timeoutController.signal])
        : timeoutController.signal

      try {
        const response = await fetchViaProxy(endpoint, {
          method: 'POST',
          headers: {
            'api-key': cfg.apiKey,
            'Content-Type': 'application/json',
          },
          redirect: 'error',
          body: JSON.stringify({
            model: cfg.model,
            messages: [
              { role: 'user', content: styleInstruction(input.language, input.speed) },
              { role: 'assistant', content: input.text },
            ],
            audio: {
              format: 'wav',
              voice: cfg.voices[input.language],
            },
          }),
          signal,
        }, cfg.proxyUrl)

        if (!response.ok) {
          throw Object.assign(new Error(`MiMo TTS HTTP ${response.status}`), { status: response.status })
        }
        const data = readAudioData(await response.json())
        if (!data) throw new Error('MiMo TTS returned no audio data')
        const audio = decodeBase64Audio(data)
        if (!audio || !isWaveAudio(audio)) throw new Error('MiMo TTS returned invalid WAV audio')
        return { audio, contentType: 'audio/wav' }
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}
