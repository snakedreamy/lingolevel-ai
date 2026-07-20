// src/hooks/useBrowserPrefs.ts — 浏览器端偏好：等级/场景/模型/输入习惯 + 主题
import { useEffect, useState } from 'react'
import { LEVELS } from '../data/levels'
import type { BrowserPrefs, DifficultyLevel } from '../types'
import { BROWSER_PREFS_KEY, DEFAULT_BROWSER_PREFS } from '../types'
import { fetchServerConfig, type ServerConfig } from '../lib/api'
import { loadStoredJson, saveStoredJson } from '../lib/storage'

const VALID_LEVELS = new Set<DifficultyLevel>(LEVELS.map((l) => l.id))

function normalizeBrowserPrefs(value: unknown): Omit<BrowserPrefs, 'theme'> {
  const defaults = { ...DEFAULT_BROWSER_PREFS }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return defaults
  const v = value as Record<string, unknown>
  return {
    ...defaults,
    scenarioId: typeof v.scenarioId === 'string' ? v.scenarioId : defaults.scenarioId,
    level: typeof v.level === 'string' && VALID_LEVELS.has(v.level as DifficultyLevel)
      ? (v.level as DifficultyLevel) : defaults.level,
    modelId: typeof v.modelId === 'string' ? v.modelId.trim() : defaults.modelId,
    sendOnCtrlEnter: v.sendOnCtrlEnter === true,
  }
}

/** 主题由 index.html 的启动脚本持有；这里只做 React 侧的订阅与回写。 */
function useTheme(): ['light' | 'dark', (next: 'light' | 'dark') => void] {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() =>
    window.__theme?.get() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))

  useEffect(() => window.__theme?.subscribe(setThemeState), [])

  const setTheme = (next: 'light' | 'dark') => {
    window.__theme?.set(next)
    setThemeState(next)
  }
  return [theme, setTheme]
}

export function useBrowserPrefs() {
  const [stored, setStored] = useState<Omit<BrowserPrefs, 'theme'>>(() =>
    normalizeBrowserPrefs(loadStoredJson<unknown>(BROWSER_PREFS_KEY, null)))
  const [theme, setTheme] = useTheme()
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null)
  const [serverConfigError, setServerConfigError] = useState(false)

  useEffect(() => { saveStoredJson(BROWSER_PREFS_KEY, stored) }, [stored])

  useEffect(() => {
    let active = true
    fetchServerConfig()
      .then((cfg) => {
        if (!active) return
        setServerConfig(cfg)
        setServerConfigError(false)
        setStored((current) => cfg.availableModels.includes(current.modelId) || !current.modelId
          ? current
          : { ...current, modelId: '' })
      })
      .catch(() => { if (active) { setServerConfig(null); setServerConfigError(true) } })
    return () => { active = false }
  }, [])

  const prefs: BrowserPrefs = { ...stored, theme }
  const setPrefs: React.Dispatch<React.SetStateAction<BrowserPrefs>> = (update) => {
    const next = typeof update === 'function' ? update(prefs) : update
    const { theme: nextTheme, ...rest } = next
    if (nextTheme !== theme) setTheme(nextTheme)
    setStored(normalizeBrowserPrefs(rest))
  }

  return { prefs, setPrefs, serverConfig, serverConfigError }
}
