export function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveStoredJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write failures so the UI still works in restricted browsers.
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

export function removeStoredValue(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage removal failures for the same reason.
  }
}
