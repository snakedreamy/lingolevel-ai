import { synthesizeSpeech } from '../api'
import { TtsError } from './types'
import type { TtsProvider, TtsSpeakInput } from './types'

function apiPlaybackAvailable(): boolean {
  return typeof Audio === 'function'
    && typeof URL.createObjectURL === 'function'
    && typeof URL.revokeObjectURL === 'function'
}

export const apiTtsProvider: TtsProvider = {
  id: 'api',

  isAvailable: apiPlaybackAvailable,

  async speak({ text, language, speed, signal }: TtsSpeakInput): Promise<void> {
    if (!apiPlaybackAvailable()) throw new TtsError('unavailable')
    if (signal.aborted) throw new TtsError('canceled')

    let blob: Blob
    try {
      blob = await synthesizeSpeech({ text, language, speed }, signal)
    } catch (error) {
      if (signal.aborted) throw new TtsError('canceled')
      throw error instanceof TtsError ? error : new TtsError('service-unavailable')
    }

    if (signal.aborted) throw new TtsError('canceled')
    const objectUrl = URL.createObjectURL(blob)
    const audio = new Audio(objectUrl)
    audio.preload = 'auto'

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
