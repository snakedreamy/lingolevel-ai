// providers/retry.ts
import { setTimeout as delay } from 'node:timers/promises'

export interface RetryOptions {
  retries?: number           // default 3
  initialDelayMs?: number    // default 1000
  timeoutMs?: number         // default 30000
  signal?: AbortSignal
}

export async function callWithRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const retries = opts.retries ?? 3
  const initialDelay = opts.initialDelayMs ?? 1000
  const timeoutMs = opts.timeoutMs ?? 30000

  let lastErr: unknown
  let attempts = 0
  for (let i = 0; i < retries; i++) {
    opts.signal?.throwIfAborted()
    attempts = i + 1
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const signal = opts.signal
      ? AbortSignal.any([controller.signal, opts.signal])
      : controller.signal
    try {
      const result = await fn(signal)
      return result
    } catch (err) {
      lastErr = err
      if (opts.signal?.aborted) throw err
      if (!isTransient(err) || i === retries - 1) break
      await waitBeforeRetry(i, retries, initialDelay, opts.signal)
    } finally {
      clearTimeout(timer)
    }
  }
  throw exhaustedError(lastErr, attempts)
}

/** 超时覆盖整个迭代；输出正文后绝不重试，以免重放或混合不同回答。 */
export async function* streamWithRetry(
  fn: (signal: AbortSignal) => AsyncIterable<string>,
  opts: RetryOptions = {},
): AsyncGenerator<string> {
  const retries = opts.retries ?? 3
  const initialDelay = opts.initialDelayMs ?? 1000
  const timeoutMs = opts.timeoutMs ?? 30000
  let lastErr: unknown
  let attempts = 0
  let emitted = false

  for (let i = 0; i < retries; i++) {
    opts.signal?.throwIfAborted()
    attempts = i + 1
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const signal = opts.signal
      ? AbortSignal.any([controller.signal, opts.signal])
      : controller.signal
    try {
      for await (const delta of fn(signal)) {
        signal.throwIfAborted()
        if (!delta) continue
        emitted = true
        yield delta
      }
      signal.throwIfAborted()
      if (!emitted) throw new Error('Stream returned empty content')
      return
    } catch (err) {
      if (opts.signal?.aborted || emitted) throw err
      lastErr = err
      if (!isTransient(err) || i === retries - 1) break
    } finally {
      clearTimeout(timer)
    }
    await waitBeforeRetry(i, retries, initialDelay, opts.signal)
  }
  throw exhaustedError(lastErr, attempts)
}

function exhaustedError(cause: unknown, attempts: number): Error {
  return Object.assign(new Error(`[retry] exhausted after ${attempts} attempt(s)`), { cause, attempts })
}

async function waitBeforeRetry(attempt: number, retries: number, initialDelay: number, signal?: AbortSignal): Promise<void> {
  const delayMs = Math.min(initialDelay * 2 ** attempt, 8000)
  console.warn(`[retry] attempt ${attempt + 1}/${retries} failed, backing off ${delayMs}ms`)
  await delay(delayMs, undefined, { signal })
}

function isTransient(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as Record<string, any>
  const status: number = e?.status ?? e?.statusCode ?? e?.error?.code ?? 0
  if ([429, 500, 502, 503, 504].includes(status)) return true
  const msg: string = (e?.message ?? '').toLowerCase()
  return (
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('spikes in demand') ||
    msg.includes('busy') ||
    msg.includes('overloaded') ||
    msg.includes('rate limit') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('json') ||
    msg.includes('parse') ||
    msg.includes('empty content')
  )
}
