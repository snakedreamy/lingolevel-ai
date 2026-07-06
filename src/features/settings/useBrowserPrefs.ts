import { useEffect, useState } from "react"
import { LEVELS } from "../../data/levels"
import type { BrowserPrefs, DifficultyLevel } from "../../types"
import { BROWSER_PREFS_KEY, DEFAULT_BROWSER_PREFS } from "../../types"
import { fetchServerConfig, type ServerConfig } from "../../lib/api"
import { loadStoredJson, saveStoredJson } from "../../lib/storage"

const VALID_LEVELS = new Set<DifficultyLevel>(LEVELS.map((level) => level.id))

type BrowserPrefsRecord = Record<string, unknown>

function isRecord(value: unknown): value is BrowserPrefsRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeBrowserPrefs(value: unknown): BrowserPrefs {
  const defaults = { ...DEFAULT_BROWSER_PREFS }

  if (!isRecord(value)) return defaults

  return {
    ...defaults,
    scenarioId: typeof value.scenarioId === "string" ? value.scenarioId : defaults.scenarioId,
    level:
      typeof value.level === "string" && VALID_LEVELS.has(value.level as DifficultyLevel)
        ? (value.level as DifficultyLevel)
        : defaults.level,
    theme: value.theme === "light" || value.theme === "dark" ? value.theme : defaults.theme,
  }
}

function getInitialPrefs(): BrowserPrefs {
  return normalizeBrowserPrefs(loadStoredJson<unknown>(BROWSER_PREFS_KEY, null))
}

export function useBrowserPrefs() {
  const [prefs, setPrefs] = useState<BrowserPrefs>(getInitialPrefs)
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null)

  useEffect(() => {
    saveStoredJson(BROWSER_PREFS_KEY, prefs)
  }, [prefs])

  useEffect(() => {
    if (prefs.theme === "dark") {
      document.documentElement.classList.add("dark")
      window.localStorage.theme = "dark"
      return
    }
    document.documentElement.classList.remove("dark")
    window.localStorage.theme = "light"
  }, [prefs.theme])

  useEffect(() => {
    let isActive = true
    fetchServerConfig()
      .then((cfg) => {
        if (!isActive) return
        setServerConfig(cfg)
      })
      .catch(() => {
        if (!isActive) return
        setServerConfig(null)
      })
    return () => {
      isActive = false
    }
  }, [])

  return {
    prefs,
    setPrefs,
    serverConfig,
  }
}
