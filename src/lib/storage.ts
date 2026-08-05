export function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function isStoredRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function saveStoredJson<T>(key: string, value: T): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function incrementStoredCounter(key: string): number {
  const current = loadStoredJson<unknown>(key, -1)
  const next = typeof current === 'number' && Number.isSafeInteger(current) && current < Number.MAX_SAFE_INTEGER
    ? current + 1
    : 0
  saveStoredJson(key, next)
  return next
}
