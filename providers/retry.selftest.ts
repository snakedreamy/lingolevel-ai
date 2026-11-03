import assert from 'node:assert/strict'
import { setImmediate, setTimeout as delay } from 'node:timers/promises'
import { streamWithRetry } from './retry'

async function collect(stream: AsyncIterable<string>): Promise<string> {
  let result = ''
  for await (const delta of stream) result += delta
  return result
}

let attempts = 0
assert.equal(await collect(streamWithRetry(async function* () {
  attempts++
  if (attempts === 1) throw Object.assign(new Error('unavailable'), { status: 503 })
  yield 'recovered'
}, { retries: 2, initialDelayMs: 0 })), 'recovered')
assert.equal(attempts, 2)

attempts = 0
assert.equal(await collect(streamWithRetry(async function* () {
  attempts++
  if (attempts === 1) return
  yield 'non-empty'
}, { retries: 2, initialDelayMs: 0 })), 'non-empty')
assert.equal(attempts, 2)

attempts = 0
await assert.rejects(collect(streamWithRetry(async function* () {
  attempts++
  throw Object.assign(new Error('bad request'), { status: 400 })
}, { retries: 2, initialDelayMs: 0 })), /exhausted after 1 attempt/)
assert.equal(attempts, 1)

// 首个 token 之前，超时必须中止正在等待的迭代，并按总尝试次数重试。
attempts = 0
let cleaned = 0
await assert.rejects(collect(streamWithRetry(async function* (signal) {
  attempts++
  try {
    await delay(1000, undefined, { signal })
    yield 'too late'
  } finally {
    cleaned++
  }
}, { retries: 2, timeoutMs: 20, initialDelayMs: 0 })), /exhausted after 2 attempt/)
assert.equal(attempts, 2)
assert.equal(cleaned, 2)

const cancellation = new AbortController()
let started!: () => void
const firstAttempt = new Promise<void>((resolve) => { started = resolve })
attempts = 0
const pending = collect(streamWithRetry(async function* () {
  attempts++
  started()
  throw Object.assign(new Error('unavailable'), { status: 503 })
}, { retries: 2, initialDelayMs: 1000, signal: cancellation.signal }))
await firstAttempt
await setImmediate()
cancellation.abort()
await assert.rejects(pending, { name: 'AbortError' })
assert.equal(attempts, 1)

// 调用方提前结束消费时，也必须执行上游 finally 并释放超时计时器。
cleaned = 0
const iterator = streamWithRetry(async function* () {
  try {
    yield 'first'
    yield 'second'
  } finally {
    cleaned++
  }
})
assert.deepEqual(await iterator.next(), { value: 'first', done: false })
await iterator.return(undefined)
assert.equal(cleaned, 1)

console.log('Stream retry self-test OK')
