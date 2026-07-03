import { useEffect, useMemo, useState } from "react"
import type { BrowserPrefs } from "../../types"
import { BROWSER_PREFS_KEY, DEFAULT_BROWSER_PREFS } from "../../types"
import { fetchServerConfig, type ServerConfig } from "../../lib/api"
import { loadStoredJson, saveStoredJson } from "../../lib/storage"

function getInitialPrefs(): BrowserPrefs {
  return {
    ...DEFAULT_BROWSER_PREFS,
    ...loadStoredJson<Partial<BrowserPrefs>>(BROWSER_PREFS_KEY, {}),
  }
}

export function useBrowserPrefs() {
  const [prefs, setPrefs] = useState<BrowserPrefs>(getInitialPrefs)
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null)
  const [dismissedMismatch, setDismissedMismatch] = useState(false)

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
        setPrefs((prev) => ({ ...prev, baseUrl: cfg.baseUrl }))
      })
      .catch(() => {
        if (!isActive) return
        setServerConfig(null)
      })
    return () => {
      isActive = false
    }
  }, [])

  const configMismatch = useMemo(() => {
    if (!serverConfig || dismissedMismatch) return false
    return (
      prefs.provider !== serverConfig.provider ||
      prefs.chatModel !== serverConfig.chatModel ||
      prefs.analyzeModel !== serverConfig.analyzeModel ||
      prefs.baseUrl !== serverConfig.baseUrl
    )
  }, [dismissedMismatch, prefs, serverConfig])

  return {
    prefs,
    setPrefs,
    serverConfig,
    configMismatch,
    dismissMismatch: () => setDismissedMismatch(true),
  }
}
