import assert from 'node:assert/strict'
import { createFallbackTtsProvider } from './fallback'
import { TtsError } from './types'
import type { TtsProvider, TtsSpeakInput } from './types'

const input = (signal: AbortSignal): TtsSpeakInput => ({
  text: 'Hello',
  language: 'en-US',
  speed: 1,
  signal,
})

function provider(args: {
  id: string
  available?: boolean
  speak: TtsProvider['speak']
}): TtsProvider {
  return {
    id: args.id,
    isAvailable: () => args.available ?? true,
    speak: args.speak,
  }
}

async function run(): Promise<void> {
  {
    const calls: string[] = []
    const combined = createFallbackTtsProvider(
      provider({ id: 'primary', speak: async () => { calls.push('primary') } }),
      provider({ id: 'fallback', speak: async () => { calls.push('fallback') } }),
    )
    await combined.speak(input(new AbortController().signal))
    assert.deepEqual(calls, ['primary'])
  }

  {
    const calls: string[] = []
    const combined = createFallbackTtsProvider(
      provider({ id: 'primary', available: false, speak: async () => { calls.push('primary') } }),
      provider({ id: 'fallback', speak: async () => { calls.push('fallback') } }),
    )
    await combined.speak(input(new AbortController().signal))
    assert.deepEqual(calls, ['fallback'])
  }

  {
    const calls: string[] = []
    const combined = createFallbackTtsProvider(
      provider({ id: 'primary', speak: async () => {
        calls.push('primary')
        throw new TtsError('playback-failed', true)
      } }),
      provider({ id: 'fallback', speak: async () => { calls.push('fallback') } }),
    )
    await combined.speak(input(new AbortController().signal))
    assert.deepEqual(calls, ['primary', 'fallback'])
  }

  {
    let fallbackCalled = false
    const combined = createFallbackTtsProvider(
      provider({ id: 'primary', speak: async () => { throw new TtsError('blocked') } }),
      provider({ id: 'fallback', speak: async () => { fallbackCalled = true } }),
    )
    await assert.rejects(combined.speak(input(new AbortController().signal)), (error: unknown) =>
      error instanceof TtsError && error.code === 'blocked')
    assert.equal(fallbackCalled, false)
  }

  console.log('TTS fallback self-test OK')
}

await run()
