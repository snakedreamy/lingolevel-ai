import { TtsError } from './types'
import type { TtsProvider, TtsSpeakInput } from './types'

function browserSpeechAvailable(): boolean {
  return typeof window !== 'undefined'
    && typeof window.speechSynthesis !== 'undefined'
    && typeof window.SpeechSynthesisUtterance === 'function'
}

function browserSpeechError(error: string): TtsError {
  if (error === 'canceled' || error === 'interrupted') return new TtsError('canceled')
  if (error === 'not-allowed') return new TtsError('blocked')
  return new TtsError('playback-failed', true)
}

export const browserTtsProvider: TtsProvider = {
  id: 'browser',

  isAvailable: browserSpeechAvailable,

  async speak({ text, language, speed, signal }: TtsSpeakInput): Promise<void> {
    if (!browserSpeechAvailable()) throw new TtsError('unavailable', true)
    if (signal.aborted) throw new TtsError('canceled')

    await new Promise<void>((resolve, reject) => {
      const synthesis = window.speechSynthesis
      const utterance = new SpeechSynthesisUtterance(text)
      let settled = false

      const settle = (callback: () => void) => {
        if (settled) return
        settled = true
        signal.removeEventListener('abort', onAbort)
        utterance.onend = null
        utterance.onerror = null
        callback()
      }
      const onAbort = () => {
        synthesis.cancel()
        settle(() => reject(new TtsError('canceled')))
      }

      utterance.lang = language
      utterance.voice = synthesis.getVoices().find((voice) =>
        voice.lang.toLowerCase() === language.toLowerCase(),
      ) ?? null
      utterance.rate = speed
      utterance.onend = () => settle(resolve)
      utterance.onerror = (event) => settle(() => reject(browserSpeechError(event.error)))
      signal.addEventListener('abort', onAbort, { once: true })

      synthesis.cancel()
      synthesis.speak(utterance)
    })
  },
}
