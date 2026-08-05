import assert from 'node:assert/strict'
import { TtsError } from './types'

const playSources: string[] = []
const revokedUrls: string[] = []
let fetchCalled = false
let rejectUnlock = false
let audioInstances = 0

class FakeAudio {
  src = ''
  muted = false
  preload = ''
  onended: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() { audioInstances += 1 }
  setAttribute(): void { /* no-op */ }
  removeAttribute(name: string): void { if (name === 'src') this.src = '' }
  load(): void { /* no-op */ }
  pause(): void { /* no-op */ }
  async play(): Promise<void> {
    playSources.push(this.src)
    if (this.src.startsWith('data:audio/wav') && rejectUnlock) throw new Error('blocked')
    if (this.src.startsWith('blob:')) queueMicrotask(() => this.onended?.())
  }
}

Object.defineProperty(globalThis, 'Audio', { configurable: true, value: FakeAudio })
Object.defineProperty(globalThis.URL, 'createObjectURL', {
  configurable: true,
  value: () => 'blob:tts-audio',
})
Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
  configurable: true,
  value: (url: string) => { revokedUrls.push(url) },
})
Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  value: async () => {
    fetchCalled = true
    assert.equal(playSources.length, 1, 'audio playback must be unlocked before fetching TTS audio')
    assert.ok(playSources[0].startsWith('data:audio/wav'))
    return new Response(new Blob(['audio'], { type: 'audio/wav' }), {
      status: 200,
      headers: { 'Content-Type': 'audio/wav' },
    })
  },
})

const { apiTtsProvider } = await import('./api')
await apiTtsProvider.speak({
  text: 'Hello',
  language: 'en-US',
  speed: 1,
  signal: new AbortController().signal,
})
assert.equal(fetchCalled, true)
assert.equal(audioInstances, 1)
assert.deepEqual(playSources.map((source) => source.startsWith('data:audio/wav') ? 'silent' : source), ['silent', 'blob:tts-audio'])
assert.deepEqual(revokedUrls, ['blob:tts-audio'])

fetchCalled = false
rejectUnlock = true
playSources.length = 0
await assert.rejects(
  apiTtsProvider.speak({
    text: 'Hello',
    language: 'en-US',
    speed: 1,
    signal: new AbortController().signal,
  }),
  (error: unknown) => error instanceof TtsError && error.code === 'blocked',
)
assert.equal(fetchCalled, false)

console.log('API TTS playback self-test OK')
