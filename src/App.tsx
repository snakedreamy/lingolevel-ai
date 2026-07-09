// src/App.tsx (merged: App + AppShell + AppHeader + MobileAnalysisDrawer)
import { useMemo, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { BookMarked, HelpCircle, Menu, Moon, Settings, Sun, X } from 'lucide-react'
import ChatWindow from './components/ChatWindow'
import SettingsModal from './components/SettingsModal'
import WordBook from './components/WordBook'
import AnalysisSidebar from './components/AnalysisSidebar'
import AskAssistant from './components/AskAssistant'
import { LEVELS } from './data/levels'
import { SCENARIOS } from './data/scenarios'
import { useBrowserPrefs } from './hooks/useBrowserPrefs'
import { useWordBook } from './hooks/useWordBook'
import { useChatSession } from './hooks/useChatSession'
import { useAskAssistant } from './hooks/useAskAssistant'
import type { ServerConfig } from './lib/api'
import type { AnalysisHistoryEntry, AskContext, BrowserPrefs, DifficultyLevel, Message, Scenario, AnalysisResult, WordItem } from './types'

// ─── AppHeader (inlined) ─────────────────────────────────────────────────────

function AppHeader({
  theme, savedWordsCount, showMobileSidebar, onToggleTheme, onOpenSettings, onOpenWordBook, onToggleMobileSidebar, onOpenAsk,
}: {
  theme: BrowserPrefs['theme']
  savedWordsCount: number
  showMobileSidebar: boolean
  onToggleTheme: () => void
  onOpenSettings: () => void
  onOpenWordBook: () => void
  onToggleMobileSidebar: () => void
  onOpenAsk: () => void
}) {
  return (
    <header className="flex-shrink-0 w-full bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 shadow-xs">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="h-8 w-8 sm:h-9 sm:w-9 bg-indigo-600 rounded-xl flex flex-shrink-0 items-center justify-center text-white font-black text-lg shadow-sm">L</div>
        <div className="min-w-0">
          <h1 className="text-[13px] sm:text-[15px] font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
            LingoLevel AI
            <span className="hidden sm:inline text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.2 rounded font-bold">Level-Adaptive</span>
          </h1>
          <p className="hidden text-[11px] text-zinc-500 font-medium sm:block">口语输出 · 纠错 · 复盘的英语练习工具</p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3">
        <button onClick={onToggleTheme}
          className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button onClick={onOpenAsk}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-2 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 sm:px-3 sm:py-1.5 cursor-pointer"
          title="打开答疑助手">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">答疑</span>
        </button>

        <button onClick={onOpenSettings}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-2 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 sm:px-3 sm:py-1.5 cursor-pointer">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">偏好设置</span>
        </button>

        <button onClick={onOpenWordBook}
          className="relative flex items-center gap-1.5 rounded-xl bg-indigo-50 px-2.5 py-2 text-xs font-bold text-indigo-600 shadow-xs transition hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900/60 sm:px-3 sm:py-1.5 cursor-pointer"
          aria-label={`我的生词本${savedWordsCount > 0 ? `，${savedWordsCount} 个词` : ''}`}>
          <BookMarked className="h-4 w-4" />
          <span className="hidden sm:inline">我的生词本</span>
          {savedWordsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full h-4.5 w-4.5 text-[9px] font-black flex items-center justify-center scale-95 animate-pulse">
              {savedWordsCount}
            </span>
          )}
        </button>

        <button onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900"
          aria-label={showMobileSidebar ? '关闭反馈面板' : '打开反馈面板'}>
          {showMobileSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
  onAddWord: (word: WordItem) => boolean
  isWordSaved: (word: string) => boolean
  onSelectSuggestion: (text: string) => void
  onPreviousAnalysis: () => void
  onNextAnalysis: () => void
  onLatestAnalysis: () => void
  onClose: () => void
}

function MobileAnalysisDrawer(props: AnalysisSidebarProps) {
  const { onClose, ...sidebarProps } = props
  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 flex max-h-[82dvh] min-h-[58dvh] flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">反馈与建议</p>
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

// ─── AppShell (internal) ─────────────────────────────────────────────────────

interface WordBookState {
  savedWords: WordItem[]
  addWord: (word: WordItem) => boolean
  removeWord: (word: string) => void
  clearAllWords: () => void
  hasWord: (word: string) => boolean
}

interface ChatSessionState {
  messages: Message[]
  analysis: AnalysisResult | null
  analysisHistory: AnalysisHistoryEntry[]
  selectedAnalysisIndex: number
  isChatLoading: boolean
  isAnalysisLoading: boolean
  resetConversation: () => Promise<void>
  sendMessage: (text: string) => Promise<void>
  addSystemMessage: (content: string) => void
  showPreviousAnalysis: () => void
  showNextAnalysis: () => void
  showLatestAnalysis: () => void
}

interface AppShellProps {
  prefs: BrowserPrefs
  setPrefs: Dispatch<SetStateAction<BrowserPrefs>>
  currentLevel: DifficultyLevel
  activeScenario: Scenario
  inputText: string
  setInputText: Dispatch<SetStateAction<string>>
  inputRef: RefObject<HTMLTextAreaElement | null>
  isSettingsOpen: boolean
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>
  isWordBookOpen: boolean
  setIsWordBookOpen: Dispatch<SetStateAction<boolean>>
  showMobileSidebar: boolean
  setShowMobileSidebar: Dispatch<SetStateAction<boolean>>
  isAskOpen: boolean
  setIsAskOpen: Dispatch<SetStateAction<boolean>>
  askContext: AskContext | null
  setAskContext: Dispatch<SetStateAction<AskContext | null>>
  serverConfig: ServerConfig | null
  serverConfigError: boolean
  wordBook: WordBookState
  chat: ChatSessionState
  ask: ReturnType<typeof useAskAssistant>
}

function AppShell({
  prefs, setPrefs, currentLevel, activeScenario, inputText, setInputText, inputRef,
  isSettingsOpen, setIsSettingsOpen, isWordBookOpen, setIsWordBookOpen,
  showMobileSidebar, setShowMobileSidebar, isAskOpen, setIsAskOpen, askContext, setAskContext,
  serverConfig, serverConfigError, wordBook, chat, ask,
}: AppShellProps) {
  const { savedWords, addWord, removeWord, clearAllWords, hasWord } = wordBook
  const {
    messages, analysis, analysisHistory, selectedAnalysisIndex,
    isChatLoading, isAnalysisLoading, resetConversation, sendMessage, addSystemMessage,
    showPreviousAnalysis, showNextAnalysis, showLatestAnalysis,
  } = chat

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
  const handleClearAllWords = () => {
    if (window.confirm('确定要清空所有生词？此操作无法撤销。')) clearAllWords()
  }

  const sidebarProps = {
    analysis, analysisHistory, selectedAnalysisIndex,
    isLoading: isAnalysisLoading, onAddWord: addWord, isWordSaved: hasWord,
    onSelectSuggestion: handleSelectSuggestion,
    onPreviousAnalysis: showPreviousAnalysis,
    onNextAnalysis: showNextAnalysis,
    onLatestAnalysis: showLatestAnalysis,
  }

  return (
    <div id="app" className="h-screen max-h-screen overflow-hidden bg-stone-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 flex flex-col font-sans relative">
      <div className="absolute top-0 left-12 w-96 h-96 bg-indigo-200/10 dark:bg-indigo-900/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-96 h-96 bg-emerald-200/5 dark:bg-emerald-900/5 rounded-full blur-3xl pointer-events-none" />

      <AppHeader
        theme={prefs.theme}
        savedWordsCount={savedWords.length}
        showMobileSidebar={showMobileSidebar}
        onToggleTheme={() => setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenWordBook={() => setIsWordBookOpen(true)}
        onToggleMobileSidebar={() => setShowMobileSidebar((prev) => !prev)}
        onOpenAsk={() => { setAskContext(null); setIsAskOpen(true) }}
      />

      <main className="flex-1 w-full max-w-[1550px] mx-auto px-2.5 sm:px-4 md:px-6 py-2.5 sm:py-4 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 min-h-0 overflow-hidden">
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
            />
          </div>
          <div className="hidden lg:block lg:col-span-1 h-full min-h-0 animate-fade-in">
            <AnalysisSidebar {...sidebarProps} />
          </div>
        </div>
      </main>

      {showMobileSidebar && (
        <MobileAnalysisDrawer {...sidebarProps} onClose={() => setShowMobileSidebar(false)} />
      )}

      <AskAssistant isOpen={isAskOpen} onClose={() => setIsAskOpen(false)}
        messages={ask.messages} isLoading={ask.isLoading}
        initialContext={askContext}
        onAsk={ask.ask} onReset={ask.reset} />

      <WordBook isOpen={isWordBookOpen} onClose={() => setIsWordBookOpen(false)}
        wordList={savedWords} onRemoveWord={removeWord} onClearAll={handleClearAllWords} />

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        currentLevel={currentLevel} onLevelChange={handleLevelChange}
        activeScenario={activeScenario}
        onScenarioSelect={(scenario) => setPrefs((p) => ({ ...p, scenarioId: scenario.id }))}
        serverConfig={serverConfig} serverConfigError={serverConfigError} />
    </div>
  )
}

// ─── App (default export) ────────────────────────────────────────────────────

export default function App() {
  const { prefs, setPrefs, serverConfig, serverConfigError } = useBrowserPrefs()
  const activeScenario = useMemo<Scenario>(
    () => SCENARIOS.find((s) => s.id === prefs.scenarioId) ?? SCENARIOS[0],
    [prefs.scenarioId],
  )
  const [inputText, setInputText] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWordBookOpen, setIsWordBookOpen] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [isAskOpen, setIsAskOpen] = useState(false)
  const [askContext, setAskContext] = useState<AskContext | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const wordBook = useWordBook()
  const chat = useChatSession({
    currentLevel: prefs.level,
    activeScenario,
    maxContextMessages: serverConfig?.maxContextMessages ?? 12,
  })
  const ask = useAskAssistant({ currentLevel: prefs.level })

  return (
    <AppShell
      prefs={prefs} setPrefs={setPrefs}
      currentLevel={prefs.level} activeScenario={activeScenario}
      inputText={inputText} setInputText={setInputText} inputRef={inputRef}
      isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen}
      isWordBookOpen={isWordBookOpen} setIsWordBookOpen={setIsWordBookOpen}
      showMobileSidebar={showMobileSidebar} setShowMobileSidebar={setShowMobileSidebar}
      isAskOpen={isAskOpen} setIsAskOpen={setIsAskOpen}
      askContext={askContext} setAskContext={setAskContext}
      serverConfig={serverConfig} serverConfigError={serverConfigError} wordBook={wordBook} chat={chat} ask={ask}
    />
  )
}
