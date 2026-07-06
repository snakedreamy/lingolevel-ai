import { useMemo, useRef, useState } from "react"
import type { Scenario } from "../types"
import { SCENARIOS } from "../data/scenarios"
import { useBrowserPrefs } from "../features/settings/useBrowserPrefs"
import { useWordBook } from "../features/wordbook/useWordBook"
import { useChatSession } from "../features/chat/useChatSession"
import AppShell from "./AppShell"

export default function App() {
  const { prefs, setPrefs, serverConfig } = useBrowserPrefs()
  const currentLevel = prefs.level
  const activeScenario = useMemo<Scenario>(
    () => SCENARIOS.find((item) => item.id === prefs.scenarioId) ?? SCENARIOS[0],
    [prefs.scenarioId],
  )
  const [inputText, setInputText] = useState("")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWordBookOpen, setIsWordBookOpen] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const wordBook = useWordBook()
  const chat = useChatSession({ currentLevel, activeScenario })

  return (
    <AppShell
      prefs={prefs}
      setPrefs={setPrefs}
      currentLevel={currentLevel}
      activeScenario={activeScenario}
      inputText={inputText}
      setInputText={setInputText}
      inputRef={inputRef}
      isSettingsOpen={isSettingsOpen}
      setIsSettingsOpen={setIsSettingsOpen}
      isWordBookOpen={isWordBookOpen}
      setIsWordBookOpen={setIsWordBookOpen}
      showMobileSidebar={showMobileSidebar}
      setShowMobileSidebar={setShowMobileSidebar}
      serverConfig={serverConfig}
      wordBook={wordBook}
      chat={chat}
    />
  )
}
