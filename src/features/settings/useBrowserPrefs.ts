import { useEffect, useMemo, useState } from "react"
import { LEVELS } from "../../data/levels"
import type { BrowserPrefs, DifficultyLevel } from "../../types"
import { BROWSER_PREFS_KEY, DEFAULT_BROWSER_PREFS } from "../../types"
import { fetchServerConfig, type ServerConfig } from "../../lib/api"
import { loadStoredJson, saveStoredJson } from "../../lib/storage"

const MISMATCH_FIELDS = ["provider", "chatModel", "analyzeModel", "baseUrl"] as const
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
    provider:
      value.provider === "openai" || value.provider === "anthropic" ? value.provider : defaults.provider,
    chatModel: typeof value.chatModel === "string" ? value.chatModel : defaults.chatModel,
    analyzeModel: typeof value.analyzeModel === "string" ? value.analyzeModel : defaults.analyzeModel,
    baseUrl: typeof value.baseUrl === "string" ? value.baseUrl : defaults.baseUrl,
    scenarioId: typeof value.scenarioId === "string" ? value.scenarioId : defaults.scenarioId,
    level:
      typeof value.level === "string" && VALID_LEVELS.has(value.level as DifficultyLevel)
        ? (value.level as DifficultyLevel)
        : defaults.level,
    theme: value.theme === "light" || value.theme === "dark" ? value.theme : defaults.theme,
  }
}

function getConfigMismatchSignature(
  prefs: BrowserPrefs,
  serverConfig: ServerConfig | null,
): string | null {
  if (!serverConfig) return null

  const hasMismatch = MISMATCH_FIELDS.some((field) => prefs[field] !== serverConfig[field])
  if (!hasMismatch) return null

  return JSON.stringify(
    MISMATCH_FIELDS.map((field) => [field, prefs[field], serverConfig[field]]),
  )
}

function getInitialPrefs(): BrowserPrefs {
  return normalizeBrowserPrefs(loadStoredJson<unknown>(BROWSER_PREFS_KEY, null))
}

export function useBrowserPrefs() {
  const [prefs, setPrefs] = useState<BrowserPrefs>(getInitialPrefs)
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null)
  const [dismissedMismatchSignature, setDismissedMismatchSignature] = useState<string | null>(null)

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
        setPrefs((prev) => (prev.baseUrl === cfg.baseUrl ? prev : { ...prev, baseUrl: cfg.baseUrl }))
      })
      .catch(() => {
        if (!isActive) return
        setServerConfig(null)
      })
    return () => {
      isActive = false
    }
  }, [])

  const mismatchSignature = useMemo(
    () => getConfigMismatchSignature(prefs, serverConfig),
    [prefs, serverConfig],
  )

  useEffect(() => {
    if (mismatchSignature === null) {
      setDismissedMismatchSignature(null)
    }
  }, [mismatchSignature])

  const configMismatch = mismatchSignature !== null && mismatchSignature !== dismissedMismatchSignature

  return {
    prefs,
    setPrefs,
    serverConfig,
    configMismatch,
    dismissMismatch: () => setDismissedMismatchSignature(mismatchSignature),
  }
}
