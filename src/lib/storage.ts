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

export function removeStoredValue(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage removal failures for the same reason.
  }
}
