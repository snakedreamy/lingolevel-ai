// src/app/App.tsx
import { useMemo, useRef, useState } from 'react'
import type { Scenario } from '../types'
import { SCENARIOS } from '../data/scenarios'
import { useBrowserPrefs } from '../hooks/useBrowserPrefs'
import { useWordBook } from '../hooks/useWordBook'
import { useChatSession } from '../hooks/useChatSession'
import AppShell from './AppShell'

export default function App() {
  const { prefs, setPrefs, serverConfig } = useBrowserPrefs()
  const activeScenario = useMemo<Scenario>(
    () => SCENARIOS.find((s) => s.id === prefs.scenarioId) ?? SCENARIOS[0],
    [prefs.scenarioId],
  )
  const [inputText, setInputText] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWordBookOpen, setIsWordBookOpen] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const wordBook = useWordBook()
  const chat = useChatSession({
    currentLevel: prefs.level,
    activeScenario,
    maxContextMessages: serverConfig?.maxContextMessages ?? 12,
  })

  return (
    <AppShell
      prefs={prefs} setPrefs={setPrefs}
      currentLevel={prefs.level} activeScenario={activeScenario}
      inputText={inputText} setInputText={setInputText} inputRef={inputRef}
      isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen}
      isWordBookOpen={isWordBookOpen} setIsWordBookOpen={setIsWordBookOpen}
      showMobileSidebar={showMobileSidebar} setShowMobileSidebar={setShowMobileSidebar}
      serverConfig={serverConfig} wordBook={wordBook} chat={chat}
    />
  )
}
