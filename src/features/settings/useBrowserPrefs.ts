import { useEffect, useMemo, useState } from "react"
import type { BrowserPrefs } from "../../types"
import { BROWSER_PREFS_KEY, DEFAULT_BROWSER_PREFS } from "../../types"
import { fetchServerConfig, type ServerConfig } from "../../lib/api"
import { loadStoredJson, saveStoredJson } from "../../lib/storage"

const MISMATCH_FIELDS = ["provider", "chatModel", "analyzeModel", "baseUrl"] as const

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
  return {
    ...DEFAULT_BROWSER_PREFS,
    ...loadStoredJson<Partial<BrowserPrefs>>(BROWSER_PREFS_KEY, {}),
  }
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
