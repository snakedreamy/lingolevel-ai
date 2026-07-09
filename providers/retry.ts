// providers/retry.ts
export interface RetryOptions {
  retries?: number           // default 3
  initialDelayMs?: number    // default 1000
  timeoutMs?: number         // default 30000
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
    attempts = i + 1
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const result = await fn(controller.signal)
      clearTimeout(timer)
      return result
    } catch (err) {
      clearTimeout(timer)
      lastErr = err
      if (!isTransient(err) || i === retries - 1) break
      const delay = Math.min(initialDelay * 2 ** i, 8000)
      console.warn(`[retry] attempt ${i + 1}/${retries} failed, backing off ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  const wrapped = new Error(
    `[retry] exhausted after ${attempts} attempt(s)`
  ) as Error & { cause?: unknown; attempts: number }
  wrapped.cause = lastErr
  wrapped.attempts = attempts
  throw wrapped
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