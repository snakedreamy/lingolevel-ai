// src/App.tsx — 应用外壳：偏好、工作区切换、全局服务（发音/答疑）与各工作区的装配
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { AppHeader, WorkspaceNav } from './components/AppShell'
import type { Workspace } from './components/AppShell'
import ChatWorkspace from './components/ChatWorkspace'
import SettingsModal from './components/SettingsModal'
import AskAssistant from './components/AskAssistant'
import FillBlankPractice from './components/FillBlankPractice'
import SystemLearning from './components/SystemLearning'
import { SpeechProvider, SpeechNoticeToast } from './components/ui'
import { SCENARIOS } from './data/scenarios'
import { useBrowserPrefs } from './hooks/useBrowserPrefs'
import { useAskPanel } from './hooks/useAskPanel'
import { useSpeechPlayer } from './lib/speech'
import { loadStoredJson, saveStoredJson } from './lib/storage'
import type { AskContext, Scenario } from './types'

const WORKSPACE_KEY = 'lingolevel_current_workspace'

function loadWorkspace(): Workspace {
  const value = loadStoredJson<unknown>(WORKSPACE_KEY, 'learning')
  return value === 'learning' || value === 'chat' || value === 'fill-blank' ? value : 'learning'
}

/** Keep inactive workspaces mounted so their in-memory session state survives tab switches. */
function KeepMountedWorkspace({
  active,
  className,
  children,
}: PropsWithChildren<{ active: boolean; className: string }>) {
  return (
    <div className={active ? className : 'hidden'} aria-hidden={active ? undefined : true}>
      {children}
    </div>
  )
}

export default function App() {
  const { prefs, setPrefs, serverConfig, serverConfigError } = useBrowserPrefs()
  const activeScenario = useMemo<Scenario>(
    () => SCENARIOS.find((scenario) => scenario.id === prefs.scenarioId) ?? SCENARIOS[0],
    [prefs.scenarioId],
  )
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [workspace, setWorkspace] = useState<Workspace>(loadWorkspace)
  const workspaceAskContextsRef = useRef<Partial<Record<Workspace, AskContext>>>({})
  const setLearningAskContext = useCallback((context: AskContext) => {
    workspaceAskContextsRef.current.learning = context
  }, [])
  const setChatAskContext = useCallback((context: AskContext) => {
    workspaceAskContextsRef.current.chat = context
  }, [])
  const setFillBlankAskContext = useCallback((context: AskContext) => {
    workspaceAskContextsRef.current['fill-blank'] = context
  }, [])
  const speech = useSpeechPlayer({
    accent: prefs.speechAccent,
    speed: prefs.speechSpeed,
    setAccent: (speechAccent) => setPrefs((current) => ({ ...current, speechAccent })),
    setSpeed: (speechSpeed) => setPrefs((current) => ({ ...current, speechSpeed })),
  })
  const ask = useAskPanel({
    level: prefs.level,
    modelId: prefs.modelId,
    thinkingEffort: prefs.thinkingEffort,
    maxContextMessages: serverConfig?.maxContextMessages,
  })

  useEffect(() => { saveStoredJson(WORKSPACE_KEY, workspace) }, [workspace])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const syncViewportHeight = () => {
      document.documentElement.style.setProperty('--visual-viewport-height', `${Math.round(viewport.height)}px`)
    }
    syncViewportHeight()
    viewport.addEventListener('resize', syncViewportHeight)
    return () => {
      viewport.removeEventListener('resize', syncViewportHeight)
      document.documentElement.style.removeProperty('--visual-viewport-height')
    }
  }, [])

  return (
    <SpeechProvider value={speech}>
      <div id="app" className="flex h-screen max-h-screen flex-col overflow-hidden bg-page font-body text-body">
        <AppHeader
          theme={prefs.theme}
          onToggleTheme={() => setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
          onOpenSettings={() => { ask.close(); setIsSettingsOpen(true) }}
          onOpenAsk={() => {
            setIsSettingsOpen(false)
            ask.open(workspaceAskContextsRef.current[workspace] ?? null)
          }}
        />

        <main className="app-main mx-auto flex min-h-0 w-full max-w-[1550px] flex-1 flex-col overflow-hidden px-2.5 py-2.5 sm:px-4 sm:py-4 md:px-6">
          <WorkspaceNav workspace={workspace} onSelect={setWorkspace} />

          <KeepMountedWorkspace active={workspace === 'learning'} className="min-h-0 flex-1 overflow-hidden">
            <SystemLearning modelId={prefs.modelId} thinkingEffort={prefs.thinkingEffort} ask={ask} onPageContextChange={setLearningAskContext} />
          </KeepMountedWorkspace>

          <KeepMountedWorkspace
            active={workspace === 'chat'}
            className="min-h-0 flex-1 overflow-hidden"
          >
            <ChatWorkspace
              prefs={prefs}
              activeScenario={activeScenario}
              modelId={prefs.modelId}
              thinkingEffort={prefs.thinkingEffort}
              maxContextMessages={serverConfig?.maxContextMessages}
              ask={ask}
              onPageContextChange={setChatAskContext}
            />
          </KeepMountedWorkspace>

          <KeepMountedWorkspace
            active={workspace === 'fill-blank'}
            className="min-h-0 flex-1 overflow-hidden"
          >
            <FillBlankPractice
              active={workspace === 'fill-blank'}
              level={prefs.level}
              modelId={prefs.modelId}
              thinkingEffort={prefs.thinkingEffort}
              onLevelChange={(level) => setPrefs((p) => ({ ...p, level }))}
              ask={ask}
              onPageContextChange={setFillBlankAskContext}
            />
          </KeepMountedWorkspace>
        </main>

        <AskAssistant isOpen={ask.isOpen} onClose={ask.close}
          messages={ask.session.messages} isLoading={ask.session.isLoading}
          initialContext={ask.context}
          onAsk={ask.session.ask} onReset={ask.session.reset}
          sendOnCtrlEnter={prefs.sendOnCtrlEnter} />

        <SpeechNoticeToast />

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
          currentLevel={prefs.level}
          onLevelChange={(level) => setPrefs((p) => ({ ...p, level }))}
          activeScenario={activeScenario}
          onScenarioSelect={(scenario) => setPrefs((p) => ({ ...p, scenarioId: scenario.id }))}
          serverConfig={serverConfig} serverConfigError={serverConfigError}
          currentModelId={prefs.modelId}
          onModelChange={(modelId) => setPrefs((p) => ({ ...p, modelId }))}
          currentThinkingEffort={prefs.thinkingEffort}
          onThinkingEffortChange={(thinkingEffort) => setPrefs((p) => ({ ...p, thinkingEffort }))}
          sendOnCtrlEnter={prefs.sendOnCtrlEnter}
          onToggleSendOnCtrlEnter={() => setPrefs((p) => ({ ...p, sendOnCtrlEnter: !p.sendOnCtrlEnter }))} />
      </div>
    </SpeechProvider>
  )
}
