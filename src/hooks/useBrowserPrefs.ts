// src/hooks/useBrowserPrefs.ts — moved from features/settings/
import { useEffect, useState } from 'react'
import { LEVELS } from '../data/levels'
import type { BrowserPrefs, DifficultyLevel } from '../types'
import { BROWSER_PREFS_KEY, DEFAULT_BROWSER_PREFS } from '../types'
import { fetchServerConfig, type ServerConfig } from '../lib/api'
import { loadStoredJson, saveStoredJson } from '../lib/storage'

const VALID_LEVELS = new Set<DifficultyLevel>(LEVELS.map((l) => l.id))

function normalizeBrowserPrefs(value: unknown): BrowserPrefs {
  const defaults = { ...DEFAULT_BROWSER_PREFS }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return defaults
  const v = value as Record<string, unknown>
  return {
    ...defaults,
    scenarioId: typeof v.scenarioId === 'string' ? v.scenarioId : defaults.scenarioId,
    level: typeof v.level === 'string' && VALID_LEVELS.has(v.level as DifficultyLevel)
      ? (v.level as DifficultyLevel) : defaults.level,
    theme: v.theme === 'light' || v.theme === 'dark' ? v.theme : defaults.theme,
    sendOnCtrlEnter: v.sendOnCtrlEnter === true,
  }
}

export function useBrowserPrefs() {
  const [prefs, setPrefs] = useState<BrowserPrefs>(() =>
    normalizeBrowserPrefs(loadStoredJson<unknown>(BROWSER_PREFS_KEY, null)))
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null)
  const [serverConfigError, setServerConfigError] = useState(false)

  useEffect(() => { saveStoredJson(BROWSER_PREFS_KEY, prefs) }, [prefs])

  useEffect(() => {
    if (prefs.theme === 'dark') {
      document.documentElement.classList.add('dark')
      window.localStorage.theme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      window.localStorage.theme = 'light'
    }
  }, [prefs.theme])

  useEffect(() => {
    let active = true
    fetchServerConfig()
      .then((cfg) => { if (active) { setServerConfig(cfg); setServerConfigError(false) } })
      .catch(() => { if (active) { setServerConfig(null); setServerConfigError(true) } })
    return () => { active = false }
  }, [])

  return { prefs, setPrefs, serverConfig, serverConfigError }
}
