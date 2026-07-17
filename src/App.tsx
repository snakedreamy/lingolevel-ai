// src/App.tsx (merged: App + AppShell + AppHeader + MobileAnalysisDrawer)
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { HelpCircle, Menu, MessageCircle, Moon, Settings, Sun, TextCursorInput, Volume2, X } from 'lucide-react'
import ChatWindow from './components/ChatWindow'
import SettingsModal from './components/SettingsModal'
import AnalysisSidebar from './components/AnalysisSidebar'
import AskAssistant from './components/AskAssistant'
import FillBlankPractice from './components/FillBlankPractice'
import { LEVELS } from './data/levels'
import { SCENARIOS } from './data/scenarios'
import { useBrowserPrefs } from './hooks/useBrowserPrefs'
import { useChatSession } from './hooks/useChatSession'
import { useAskAssistant } from './hooks/useAskAssistant'
import { useSpeechPlayer } from './lib/speech'
import type { SpeechPlayer } from './lib/speech'
import type { AnalysisHistoryEntry, AskContext, BrowserPrefs, DifficultyLevel, Scenario, AnalysisResult } from './types'

type Workspace = 'chat' | 'fill-blank'

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
    <header className="app-header relative z-30 flex-shrink-0 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="h-8 w-8 sm:h-9 sm:w-9 bg-indigo-600 rounded-xl flex flex-shrink-0 items-center justify-center text-white font-black text-lg shadow-sm">L</div>
        <div className="min-w-0">
          <h1 className="text-[13px] sm:text-[15px] font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
            LingoLevel AI
          </h1>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3">
        <button type="button" onClick={onToggleTheme}
          className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
          title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
          aria-label={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <details className="group relative">
          <summary aria-label="打开发音设置"
            className="flex cursor-pointer list-none items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-2 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 sm:px-3 sm:py-1.5 [&::-webkit-details-marker]:hidden">
            <Volume2 className="h-4 w-4" />
            <span className="hidden sm:inline">发音</span>
          </summary>
          <div className="fixed inset-x-4 top-16 z-[60] w-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+.5rem)] sm:w-72">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">发音设置</p>
            <div className="mt-3 grid grid-cols-2 gap-2" aria-label="口音">
              {(['us', 'uk'] as const).map((accent) => (
                <button key={accent} type="button" onClick={() => speech.setAccent(accent)} aria-pressed={speech.accent === accent}
                  className={`h-9 rounded-lg border text-xs font-semibold transition ${speech.accent === accent
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300'}`}>
                  {accent === 'us' ? '🇺🇸 美音' : '🇬🇧 英音'}
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">语速</span>
              <input type="range" min="0.5" max="1.5" step="0.1" value={speech.speed}
                onChange={(event) => speech.setSpeed(Number(event.target.value))}
                className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-indigo-600 dark:bg-zinc-700" />
              <output className="w-9 text-right font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{speech.speed.toFixed(1)}x</output>
            </label>
          </div>
        </details>

        <button type="button" onClick={onOpenAsk}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-2 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 sm:px-3 sm:py-1.5 cursor-pointer"
          title="打开答疑助手">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">答疑</span>
        </button>

        <button type="button" onClick={onOpenSettings}
          aria-label="打开偏好设置"
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-2 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 sm:px-3 sm:py-1.5 cursor-pointer">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">偏好设置</span>
        </button>

        {showFeedbackButton && (
          <button type="button" onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900"
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
        className="absolute inset-x-0 bottom-0 flex max-h-[82dvh] min-h-[58dvh] flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <p id="feedback-drawer-title" className="text-xs font-bold text-zinc-900 dark:text-zinc-100">反馈与建议</p>
          <button type="button" onClick={onClose} className="rounded-full border border-zinc-200 p-2 text-zinc-500 dark:border-zinc-800 dark:text-zinc-300" aria-label="关闭反馈面板">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
          <AnalysisSidebar {...sidebarProps} embedded
            onSelectSuggestion={(text) => { sidebarProps.onSelectSuggestion(text); onClose() }} />
        </div>
      </div>
    </div>
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
  const [workspace, setWorkspace] = useState<Workspace>('chat')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const speech = useSpeechPlayer()
  const modelId = prefs.modelId
  const chat = useChatSession({
    currentLevel: prefs.level,
    activeScenario,
    maxContextMessages: serverConfig?.maxContextMessages ?? 12,
    modelId,
  })
  const {
    messages, analysis, analysisHistory, selectedAnalysisIndex,
    isChatLoading, isAnalysisLoading, resetConversation, sendMessage, addSystemMessage,
    regeneratableAssistantId, regenerateLastReply, retrySelectedAnalysis,
    showPreviousAnalysis, showNextAnalysis, showLatestAnalysis,
  } = chat
  const ask = useAskAssistant({ currentLevel: prefs.level, modelId })
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
    <div id="app" className="h-screen max-h-screen overflow-hidden bg-stone-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 flex flex-col font-sans">
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

      <main className="app-main flex-1 w-full max-w-[1550px] mx-auto px-2.5 sm:px-4 md:px-6 py-2.5 sm:py-4 flex flex-col min-h-0 overflow-hidden">
        <nav className="app-workspace-nav mb-2.5 flex shrink-0 items-center gap-5 border-b border-zinc-200 dark:border-zinc-800 sm:mb-3 sm:w-fit" aria-label="学习模式">
          <button type="button" onClick={() => setWorkspace('chat')} aria-current={workspace === 'chat' ? 'page' : undefined}
            className={`flex h-10 flex-1 items-center justify-center gap-2 border-b-2 px-1 text-xs font-bold transition sm:flex-none ${workspace === 'chat' ? 'border-indigo-600 text-zinc-950 dark:text-white' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}>
            <MessageCircle className="h-4 w-4" /> 对话练习
          </button>
          <button type="button" onClick={() => { setShowMobileSidebar(false); setWorkspace('fill-blank') }} aria-current={workspace === 'fill-blank' ? 'page' : undefined}
            className={`flex h-10 flex-1 items-center justify-center gap-2 border-b-2 px-1 text-xs font-bold transition sm:flex-none ${workspace === 'fill-blank' ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}>
            <TextCursorInput className="h-4 w-4" /> 填词练习
          </button>
        </nav>

        <KeepMountedWorkspace
          active={workspace === 'chat'}
          className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 min-h-0 overflow-hidden"
        >
          <div className="lg:col-span-3 flex flex-col h-full min-h-0 overflow-hidden">
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
          <div className="hidden lg:block lg:col-span-1 h-full min-h-0 animate-fade-in">
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
          className={`fixed bottom-4 left-1/2 z-[70] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-lg backdrop-blur ${speech.notice.kind === 'error'
            ? 'border-amber-200 bg-amber-50/95 text-amber-800 dark:border-amber-900 dark:bg-amber-950/95 dark:text-amber-200'
            : 'border-zinc-200 bg-white/95 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-200'}`}>
          {speech.notice.kind === 'error' ? <HelpCircle className="h-4 w-4 shrink-0" /> : <Volume2 className="h-4 w-4 shrink-0 text-indigo-500" />}
          <span className="min-w-0 text-center">{speech.notice.message}</span>
          {speech.activeId && (
            <button type="button" onClick={speech.stop} className="ml-1 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
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
