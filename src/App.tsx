// src/App.tsx (merged: App + AppShell + AppHeader + MobileAnalysisDrawer)
import { useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { HelpCircle, Menu, MessageCircle, Moon, Settings, Sun, TextCursorInput, X } from 'lucide-react'
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
  theme, showMobileSidebar, showFeedbackButton, onToggleTheme, onOpenSettings, onToggleMobileSidebar, onOpenAsk,
}: {
  theme: BrowserPrefs['theme']
  showMobileSidebar: boolean
  showFeedbackButton: boolean
  onToggleTheme: () => void
  onOpenSettings: () => void
  onToggleMobileSidebar: () => void
  onOpenAsk: () => void
}) {
  return (
    <header className="flex-shrink-0 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="h-8 w-8 sm:h-9 sm:w-9 bg-indigo-600 rounded-xl flex flex-shrink-0 items-center justify-center text-white font-black text-lg shadow-sm">L</div>
        <div className="min-w-0">
          <h1 className="text-[13px] sm:text-[15px] font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
            LingoLevel AI
            <span className="hidden sm:inline text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">自适应难度</span>
          </h1>
          <p className="hidden text-[11px] text-zinc-500 font-medium sm:block">对话 · 填词 · 纠错 · 复习</p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3">
        <button type="button" onClick={onToggleTheme}
          className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
          title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
          aria-label={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

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
          <div>
            <p id="feedback-drawer-title" className="text-xs font-bold text-zinc-900 dark:text-zinc-100">反馈与建议</p>
            <p className="text-[11px] text-zinc-500">上滑查看纠错、翻译与接话建议</p>
          </div>
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
  }

  return (
    <div id="app" className="h-screen max-h-screen overflow-hidden bg-stone-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 flex flex-col font-sans">
      <AppHeader
        theme={prefs.theme}
        showMobileSidebar={showMobileSidebar}
        showFeedbackButton={workspace === 'chat'}
        onToggleTheme={() => setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleMobileSidebar={() => setShowMobileSidebar((prev) => !prev)}
        onOpenAsk={() => { setAskContext(null); setIsAskOpen(true) }}
      />

      <main className="flex-1 w-full max-w-[1550px] mx-auto px-2.5 sm:px-4 md:px-6 py-2.5 sm:py-4 flex flex-col min-h-0 overflow-hidden">
        <nav className="mb-2.5 flex shrink-0 items-center gap-5 border-b border-zinc-200 dark:border-zinc-800 sm:mb-3 sm:w-fit" aria-label="学习模式">
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
            scenario={activeScenario}
            modelId={modelId}
            onLevelChange={handleLevelChange}
            onAskWord={openAskWithWord}
            onBackToChat={() => setWorkspace('chat')}
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
        sendOnCtrlEnter={prefs.sendOnCtrlEnter} />

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
