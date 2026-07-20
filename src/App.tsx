// src/App.tsx (merged: App + AppShell + AppHeader + MobileAnalysisDrawer)
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { HelpCircle, Menu, Moon, Settings, Sun, Volume2, X } from './components/Icon'
import ChatWindow from './components/ChatWindow'
import SettingsModal from './components/SettingsModal'
import AnalysisSidebar from './components/AnalysisSidebar'
import AskAssistant from './components/AskAssistant'
import FillBlankPractice from './components/FillBlankPractice'
import SystemLearning from './components/SystemLearning'
import { LEVELS } from './data/levels'
import { SCENARIOS } from './data/scenarios'
import { useBrowserPrefs } from './hooks/useBrowserPrefs'
import { useChatSession } from './hooks/useChatSession'
import { useAskAssistant } from './hooks/useAskAssistant'
import { useSpeechPlayer } from './lib/speech'
import type { SpeechPlayer } from './lib/speech'
import type { AnalysisHistoryEntry, AskContext, BrowserPrefs, DifficultyLevel, Scenario, AnalysisResult } from './types'

type Workspace = 'learning' | 'fill-blank' | 'chat'

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

// ─── AppHeader (inlined) ─────────────────────────────────────────────────────

function AppHeader({
  theme, speech, showMobileSidebar, showFeedbackButton, onToggleTheme, onOpenSettings, onToggleMobileSidebar, onOpenAsk,
}: {
  theme: BrowserPrefs['theme']
  speech: SpeechPlayer
  showMobileSidebar: boolean
  showFeedbackButton: boolean
  onToggleTheme: () => void
  onOpenSettings: () => void
  onToggleMobileSidebar: () => void
  onOpenAsk: () => void
}) {
  return (
    <header className="app-header relative z-30 flex w-full flex-shrink-0 items-center justify-between gap-2 border-b-2 border-ink bg-paper px-3 py-2.5 dark:border-ink-dark dark:bg-paper-dark sm:px-6 sm:py-3">
      <div className="flex min-w-0 items-baseline gap-2.5">
        <h1 className="truncate font-display text-lg font-semibold leading-none tracking-tight text-ink dark:text-ink-dark sm:text-xl">
          LingoLevel&nbsp;AI
        </h1>
        <span className="margin-code hidden sm:inline">语法 · 对话 · 练习</span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
        <button type="button" onClick={onToggleTheme}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-ink/25 text-ink/70 transition hover:border-ink hover:text-ink dark:border-ink-dark/30 dark:text-ink-dark/70 dark:hover:border-ink-dark dark:hover:text-ink-dark"
          title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
          aria-label={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <details className="group relative">
          <summary aria-label="打开发音设置"
            className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border border-ink/25 px-2.5 text-xs font-semibold text-ink/80 transition hover:border-ink hover:text-ink dark:border-ink-dark/30 dark:text-ink-dark/80 dark:hover:border-ink-dark dark:hover:text-ink-dark sm:px-3 [&::-webkit-details-marker]:hidden">
            <Volume2 className="h-4 w-4" />
            <span className="hidden sm:inline">发音</span>
          </summary>
          <div className="fixed inset-x-4 top-16 z-[60] w-auto rounded-lg border border-ink/20 bg-leaf p-4 shadow-xl dark:border-ink-dark/25 dark:bg-leaf-dark sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+.5rem)] sm:w-72">
            <p className="margin-code">发音设置</p>
            <div className="mt-3 grid grid-cols-2 gap-2" aria-label="口音">
              {(['us', 'uk'] as const).map((accent) => (
                <button key={accent} type="button" onClick={() => speech.setAccent(accent)} aria-pressed={speech.accent === accent}
                  className={`h-9 rounded-md border text-xs font-semibold transition ${speech.accent === accent
                    ? 'border-forest bg-forest/10 text-forest dark:border-forest-dark dark:bg-forest-dark/10 dark:text-forest-dark'
                    : 'border-ink/20 text-ink/60 hover:border-ink/50 dark:border-ink-dark/25 dark:text-ink-dark/60 dark:hover:border-ink-dark/60'}`}>
                  {accent === 'us' ? '美音 US' : '英音 UK'}
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-3">
              <span className="text-xs font-semibold text-ink/70 dark:text-ink-dark/70">语速</span>
              <input type="range" min="0.5" max="1.5" step="0.1" value={speech.speed}
                onChange={(event) => speech.setSpeed(Number(event.target.value))}
                className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg bg-ink/15 accent-forest dark:bg-ink-dark/20 dark:accent-forest-dark" />
              <output className="w-9 text-right font-mono text-xs font-bold text-forest dark:text-forest-dark">{speech.speed.toFixed(1)}x</output>
            </label>
          </div>
        </details>

        <button type="button" onClick={onOpenAsk}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-ink/25 px-2.5 text-xs font-semibold text-ink/80 transition hover:border-ink hover:text-ink dark:border-ink-dark/30 dark:text-ink-dark/80 dark:hover:border-ink-dark dark:hover:text-ink-dark sm:px-3"
          title="打开答疑助手">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">答疑</span>
        </button>

        <button type="button" onClick={onOpenSettings}
          aria-label="打开偏好设置"
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-ink/25 px-2.5 text-xs font-semibold text-ink/80 transition hover:border-ink hover:text-ink dark:border-ink-dark/30 dark:text-ink-dark/80 dark:hover:border-ink-dark dark:hover:text-ink-dark sm:px-3">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">偏好设置</span>
        </button>

        {showFeedbackButton && (
          <button type="button" onClick={onToggleMobileSidebar}
            className="grid h-9 w-9 place-items-center rounded-md border border-ink/25 text-ink/70 dark:border-ink-dark/30 dark:text-ink-dark/70 lg:hidden"
            aria-label={showMobileSidebar ? '关闭反馈面板' : '打开反馈面板'}>
            {showMobileSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
      </div>
    </header>
  )
}

// ─── MobileAnalysisDrawer (inlined) ─────────────────────────────────────────

type AnalysisSidebarProps = {
  analysis: AnalysisResult | null
  analysisHistory: AnalysisHistoryEntry[]
  selectedAnalysisIndex: number
  isLoading: boolean
  onSelectSuggestion: (text: string) => void
  onPreviousAnalysis: () => void
  onNextAnalysis: () => void
  onLatestAnalysis: () => void
  onRetryAnalysis: () => void
  speech: SpeechPlayer
  onClose: () => void
}

function MobileAnalysisDrawer(props: AnalysisSidebarProps) {
  const { onClose, ...sidebarProps } = props
  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="feedback-drawer-title"
        className="absolute inset-x-0 bottom-0 flex max-h-[82dvh] min-h-[58dvh] flex-col overflow-hidden rounded-t-2xl border-t-2 border-ink bg-paper shadow-2xl dark:border-ink-dark dark:bg-paper-dark"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink/15 px-4 py-3 dark:border-ink-dark/20">
          <p id="feedback-drawer-title" className="margin-code">旁批 · 反馈与建议</p>
          <button type="button" onClick={onClose} className="rounded-md border border-ink/25 p-2 text-ink/60 dark:border-ink-dark/30 dark:text-ink-dark/70" aria-label="关闭反馈面板">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AnalysisSidebar {...sidebarProps} embedded
            onSelectSuggestion={(text) => { sidebarProps.onSelectSuggestion(text); onClose() }} />
        </div>
      </div>
    </div>
  )
}

// ─── WorkspaceNav ────────────────────────────────────────────────────────────

const WORKSPACES: Array<{ id: Workspace; code: string; label: string; hint: string }> = [
  { id: 'learning', code: '壹', label: '课程', hint: '系统学习：按课程掌握新知识' },
  { id: 'fill-blank', code: '贰', label: '填空', hint: '填词练习：自由生成与快速测试' },
  { id: 'chat', code: '叁', label: '会话', hint: '对话练习：自由表达与交流' },
]

function WorkspaceNav({ workspace, onSelect }: { workspace: Workspace; onSelect: (next: Workspace) => void }) {
  return (
    <nav className="app-workspace-nav mb-2.5 flex shrink-0 items-stretch gap-0 border-b border-ink/15 dark:border-ink-dark/20 sm:mb-3 sm:w-fit" aria-label="学习模式">
      {WORKSPACES.map((item) => {
        const active = workspace === item.id
        return (
          <button key={item.id} type="button" title={item.hint} aria-label={item.hint}
            onClick={() => onSelect(item.id)} aria-current={active ? 'page' : undefined}
            className={`relative flex h-11 flex-1 cursor-pointer items-baseline justify-center gap-2 px-3 transition sm:flex-none sm:px-5 ${active
              ? 'text-ink dark:text-ink-dark'
              : 'text-ink/45 hover:text-ink/80 dark:text-ink-dark/45 dark:hover:text-ink-dark/80'}`}>
            <span className={`margin-code ${active ? '!text-scarlet dark:!text-scarlet-dark' : ''}`}>{item.code}</span>
            <span className={`font-display text-base ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            {active && <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 bg-scarlet dark:bg-scarlet-dark" />}
          </button>
        )
      })}
    </nav>
  )
}

export default function App() {
  const { prefs, setPrefs, serverConfig, serverConfigError } = useBrowserPrefs()
  const activeScenario = useMemo<Scenario>(
    () => SCENARIOS.find((scenario) => scenario.id === prefs.scenarioId) ?? SCENARIOS[0],
    [prefs.scenarioId],
  )
  const [inputText, setInputText] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [isAskOpen, setIsAskOpen] = useState(false)
  const [askContext, setAskContext] = useState<AskContext | null>(null)
  const [workspace, setWorkspace] = useState<Workspace>('learning')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const speech = useSpeechPlayer()
  const modelId = prefs.modelId
  const chat = useChatSession({
    currentLevel: prefs.level,
    activeScenario,
    maxContextMessages: serverConfig?.maxContextMessages,
    modelId,
  })
  const {
    messages, analysis, analysisHistory, selectedAnalysisIndex,
    isChatLoading, isAnalysisLoading, resetConversation, sendMessage, addSystemMessage,
    regeneratableAssistantId, regenerateLastReply, retrySelectedAnalysis,
    showPreviousAnalysis, showNextAnalysis, showLatestAnalysis,
  } = chat
  const ask = useAskAssistant({
    currentLevel: prefs.level,
    modelId,
    maxContextMessages: serverConfig?.maxContextMessages,
  })
  const currentLevel = prefs.level

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

  const handleLevelChange = (level: DifficultyLevel) => {
    setPrefs((p) => ({ ...p, level }))
    const levelName = LEVELS.find((item) => item.id === level)?.name ?? level
    addSystemMessage(`⚙️ 难度调整为: ${levelName}`)
  }

  const handleSendMessage = (text: string) => { void sendMessage(text); setInputText('') }
  const openAskWithWord = (word: string) => { setAskContext({ word }); setIsAskOpen(true) }
  const openAskWithSentence = (sentence: string) => { setAskContext({ sentence }); setIsAskOpen(true) }
  const openAskWithLesson = (context: AskContext, question: string) => {
    setAskContext(context)
    setIsAskOpen(true)
    void ask.ask(question, context, { resetHistory: true })
  }
  const handleSelectSuggestion = (text: string) => { setInputText(text); inputRef.current?.focus() }
  const handleResetChat = () => {
    if (window.confirm('确定要清空当前对话，重新开始吗？')) void resetConversation()
  }
  const sidebarProps = {
    analysis, analysisHistory, selectedAnalysisIndex,
    isLoading: isAnalysisLoading,
    onSelectSuggestion: handleSelectSuggestion,
    onPreviousAnalysis: showPreviousAnalysis,
    onNextAnalysis: showNextAnalysis,
    onLatestAnalysis: showLatestAnalysis,
    onRetryAnalysis: retrySelectedAnalysis,
    speech,
  }

  return (
    <div id="app" className="flex h-screen max-h-screen flex-col overflow-hidden bg-paper font-body text-ink dark:bg-paper-dark dark:text-ink-dark">
      <AppHeader
        theme={prefs.theme}
        speech={speech}
        showMobileSidebar={showMobileSidebar}
        showFeedbackButton={workspace === 'chat'}
        onToggleTheme={() => setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleMobileSidebar={() => setShowMobileSidebar((prev) => !prev)}
        onOpenAsk={() => { setAskContext(null); setIsAskOpen(true) }}
      />

      <main className="app-main mx-auto flex min-h-0 w-full max-w-[1550px] flex-1 flex-col overflow-hidden px-2.5 py-2.5 sm:px-4 sm:py-4 md:px-6">
        <WorkspaceNav workspace={workspace} onSelect={(next) => { setShowMobileSidebar(false); setWorkspace(next) }} />

        <KeepMountedWorkspace active={workspace === 'learning'} className="min-h-0 flex-1 overflow-hidden">
          <SystemLearning speech={speech} modelId={modelId} onAskTutor={openAskWithLesson} />
        </KeepMountedWorkspace>

        <KeepMountedWorkspace
          active={workspace === 'chat'}
          className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden sm:gap-4 lg:grid-cols-4"
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden lg:col-span-3">
              <ChatWindow
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
                activeScenario={activeScenario}
                onResetChat={handleResetChat}
                inputRef={inputRef}
                inputText={inputText}
                setInputText={setInputText}
                onWordClick={openAskWithWord}
                onSelectSentence={openAskWithSentence}
                regeneratableAssistantId={regeneratableAssistantId}
                onRegenerateMessage={() => { void regenerateLastReply() }}
                sendOnCtrlEnter={prefs.sendOnCtrlEnter}
                speech={speech}
              />
          </div>
          <div className="hidden h-full min-h-0 animate-fade-in lg:col-span-1 lg:block">
            <AnalysisSidebar {...sidebarProps} />
          </div>
        </KeepMountedWorkspace>

        <KeepMountedWorkspace
          active={workspace === 'fill-blank'}
          className="min-h-0 flex-1 overflow-hidden"
        >
          <FillBlankPractice
            active={workspace === 'fill-blank'}
            level={currentLevel}
            modelId={modelId}
            onLevelChange={handleLevelChange}
            onAskWord={openAskWithWord}
            speech={speech}
          />
        </KeepMountedWorkspace>
      </main>

      {workspace === 'chat' && showMobileSidebar && (
        <MobileAnalysisDrawer {...sidebarProps} onClose={() => setShowMobileSidebar(false)} />
      )}

      <AskAssistant isOpen={isAskOpen} onClose={() => setIsAskOpen(false)}
        messages={ask.messages} isLoading={ask.isLoading}
        initialContext={askContext}
        onAsk={ask.ask} onReset={ask.reset}
        sendOnCtrlEnter={prefs.sendOnCtrlEnter} speech={speech} />

      {speech.notice && (
        <div role="status" aria-live="polite"
          className={`fixed bottom-4 left-1/2 z-[70] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur ${speech.notice.kind === 'error'
            ? 'border-scarlet/40 bg-scarlet/10 text-scarlet dark:border-scarlet-dark/50 dark:bg-scarlet-dark/15 dark:text-scarlet-dark'
            : 'border-ink/20 bg-leaf/95 text-ink/80 dark:border-ink-dark/25 dark:bg-leaf-dark/95 dark:text-ink-dark/80'}`}>
          {speech.notice.kind === 'error' ? <HelpCircle className="h-4 w-4 shrink-0" /> : <Volume2 className="h-4 w-4 shrink-0 text-forest dark:text-forest-dark" />}
          <span className="min-w-0 text-center">{speech.notice.message}</span>
          {speech.activeId && (
            <button type="button" onClick={speech.stop} className="ml-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-bold text-paper dark:bg-ink-dark dark:text-paper-dark">
              停止
            </button>
          )}
          <button type="button" onClick={speech.clearNotice} aria-label="关闭朗读提示" className="ml-1 rounded p-0.5 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        currentLevel={currentLevel} onLevelChange={handleLevelChange}
        activeScenario={activeScenario}
        onScenarioSelect={(scenario) => setPrefs((p) => ({ ...p, scenarioId: scenario.id }))}
        serverConfig={serverConfig} serverConfigError={serverConfigError}
        currentModelId={modelId}
        onModelChange={(nextModelId) => setPrefs((p) => ({ ...p, modelId: nextModelId }))}
        sendOnCtrlEnter={prefs.sendOnCtrlEnter}
        onToggleSendOnCtrlEnter={() => setPrefs((p) => ({ ...p, sendOnCtrlEnter: !p.sendOnCtrlEnter }))} />
    </div>
  )
}
