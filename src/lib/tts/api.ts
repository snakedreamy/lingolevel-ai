import { synthesizeSpeech } from '../api'
import { TtsError } from './types'
import type { TtsProvider, TtsSpeakInput } from './types'

const SILENT_WAV = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQIAAAAAAA=='

function apiPlaybackAvailable(): boolean {
  return typeof Audio === 'function'
    && typeof URL.createObjectURL === 'function'
    && typeof URL.revokeObjectURL === 'function'
}

async function unlockAudioPlayback(audio: HTMLAudioElement, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new TtsError('canceled')
  audio.muted = true
  audio.src = SILENT_WAV
  try {
    await audio.play()
  } catch {
    throw new TtsError('blocked')
  } finally {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    audio.muted = false
  }
}

export const apiTtsProvider: TtsProvider = {
  id: 'api',

  isAvailable: apiPlaybackAvailable,

  async speak({ text, language, speed, signal }: TtsSpeakInput): Promise<void> {
    if (!apiPlaybackAvailable()) throw new TtsError('unavailable')
    if (signal.aborted) throw new TtsError('canceled')

    const audio = new Audio()
    audio.preload = 'auto'
    audio.setAttribute('playsinline', '')
    await unlockAudioPlayback(audio, signal)

    let blob: Blob
    try {
      blob = await synthesizeSpeech({ text, language, speed }, signal)
    } catch (error) {
      if (signal.aborted) throw new TtsError('canceled')
      throw error instanceof TtsError ? error : new TtsError('service-unavailable')
    }

    if (signal.aborted) throw new TtsError('canceled')
    const objectUrl = URL.createObjectURL(blob)
    audio.src = objectUrl

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const cleanup = () => {
        signal.removeEventListener('abort', onAbort)
        audio.onended = null
        audio.onerror = null
        URL.revokeObjectURL(objectUrl)
      }
      const settle = (callback: () => void) => {
        if (settled) return
        settled = true
        cleanup()
        callback()
      }
      const onAbort = () => {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
        settle(() => reject(new TtsError('canceled')))
      }

      signal.addEventListener('abort', onAbort, { once: true })
      audio.onended = () => settle(resolve)
      audio.onerror = () => settle(() => reject(new TtsError('playback-failed')))
      audio.play().catch(() => settle(() => reject(new TtsError('blocked'))))
    })
  },
}
