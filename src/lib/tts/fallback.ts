import { TtsError } from './types'
import type { TtsProvider, TtsSpeakInput } from './types'

export function createFallbackTtsProvider(primary: TtsProvider, fallback: TtsProvider): TtsProvider {
  return {
    id: `${primary.id}:${fallback.id}`,

    isAvailable: () => primary.isAvailable() || fallback.isAvailable(),

    async speak(input: TtsSpeakInput): Promise<void> {
      if (primary.isAvailable()) {
        try {
          await primary.speak(input)
          return
        } catch (error) {
          if (input.signal.aborted) throw new TtsError('canceled')
          if (!(error instanceof TtsError) || !error.fallbackAllowed) throw error
        }
      }

      if (!fallback.isAvailable()) throw new TtsError('unavailable')
      await fallback.speak(input)
    },
  }
}
