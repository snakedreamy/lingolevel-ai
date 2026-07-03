import type { Dispatch, RefObject, SetStateAction } from "react"
import {
  BookMarked,
  Menu,
  Moon,
  Settings,
  Sun,
  X,
} from "lucide-react"
import AnalysisSidebar from "../components/AnalysisSidebar"
import ChatWindow from "../components/ChatWindow"
import SettingsModal from "../components/SettingsModal"
import WordBook from "../components/WordBook"
import { LEVELS } from "../data/levels"
import { SCENARIOS } from "../data/scenarios"
import type { ServerConfig } from "../lib/api"
import type { BrowserPrefs, DifficultyLevel, Message, Scenario, AnalysisResult, WordItem } from "../types"

interface WordBookState {
  savedWords: WordItem[]
  addWord: (word: WordItem) => void
  removeWord: (word: string) => void
  clearAllWords: () => void
}

interface ChatSessionState {
  messages: Message[]
  analysis: AnalysisResult | null
  isChatLoading: boolean
  isAnalysisLoading: boolean
  resetConversation: () => Promise<void>
  sendMessage: (text: string) => Promise<void>
  setAnalysis: Dispatch<SetStateAction<AnalysisResult | null>>
  addSystemMessage: (content: string) => void
}

interface AppShellProps {
  prefs: BrowserPrefs
  setPrefs: Dispatch<SetStateAction<BrowserPrefs>>
  currentLevel: DifficultyLevel
  setCurrentLevel: Dispatch<SetStateAction<DifficultyLevel>>
  activeScenario: Scenario
  setActiveScenario: Dispatch<SetStateAction<Scenario>>
  inputText: string
  setInputText: Dispatch<SetStateAction<string>>
  inputRef: RefObject<HTMLTextAreaElement | null>
  isSettingsOpen: boolean
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>
  isWordBookOpen: boolean
  setIsWordBookOpen: Dispatch<SetStateAction<boolean>>
  showMobileSidebar: boolean
  setShowMobileSidebar: Dispatch<SetStateAction<boolean>>
  serverConfig: ServerConfig | null
  configMismatch: boolean
  dismissMismatch: () => void
  wordBook: WordBookState
  chat: ChatSessionState
}

export default function AppShell({
  prefs,
  setPrefs,
  currentLevel,
  setCurrentLevel,
  activeScenario,
  setActiveScenario,
  inputText,
  setInputText,
  inputRef,
  isSettingsOpen,
  setIsSettingsOpen,
  isWordBookOpen,
  setIsWordBookOpen,
  showMobileSidebar,
  setShowMobileSidebar,
  serverConfig,
  configMismatch,
  dismissMismatch,
  wordBook,
  chat,
}: AppShellProps) {
  const { savedWords, addWord, removeWord, clearAllWords } = wordBook
  const { messages, analysis, isChatLoading, isAnalysisLoading, resetConversation, sendMessage, addSystemMessage } = chat

  const handleScenarioSelect = (scenario: Scenario) => {
    setActiveScenario(scenario)
    setPrefs((p) => ({ ...p, scenarioId: scenario.id }))
  }

  const handleLevelChange = (level: DifficultyLevel) => {
    setCurrentLevel(level)
    setPrefs((p) => ({ ...p, level }))
    const levelName = LEVELS.find((item) => item.id === level)?.name || level
    addSystemMessage(`⚙️ 难度成功调整为: ${levelName} | 下一轮发言 AI 将自动调频适配该难度`)
  }

  const handleSavePrefs = (next: BrowserPrefs) => {
    setPrefs(next)
    if (next.level !== currentLevel) {
      handleLevelChange(next.level)
    }
    if (next.scenarioId !== activeScenario.id) {
      const newScenario = SCENARIOS.find((scenario) => scenario.id === next.scenarioId) ?? activeScenario
      handleScenarioSelect(newScenario)
    }
  }

  const handleClearAllWords = () => {
    if (window.confirm("确定要清空您收集的所有单词和口语短语吗？此操作无法撤销。")) {
      clearAllWords()
    }
  }

  const handleSendMessage = (text: string) => {
    void sendMessage(text)
    setInputText("")
  }

  const handleSelectSuggestion = (text: string) => {
    setInputText(text)
    inputRef.current?.focus()
  }

  const handleResetChat = () => {
    if (window.confirm("确定要清空当前对话，重新开始本情景模态口语实战吗？")) {
      void resetConversation()
    }
  }

  return (
    <div id="app" className="h-screen max-h-screen overflow-hidden bg-stone-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 flex flex-col font-sans relative">
      <div className="absolute top-0 left-12 w-96 h-96 bg-indigo-200/10 dark:bg-indigo-900/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-96 h-96 bg-emerald-200/5 dark:bg-emerald-900/5 rounded-full blur-3xl pointer-events-none" />

      <header className="flex-shrink-0 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm">
            E
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-1.5">
              英语口语 AI 智能教练
              <span className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.2 rounded font-bold">
                Level-Adaptive
              </span>
            </h1>
            <p className="text-[11px] text-zinc-500 font-medium">
              专为中国用户打磨的沉浸式智能纠错英语学习沙盒
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPrefs((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }))}
            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
            title={prefs.theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {prefs.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer text-zinc-700 dark:text-zinc-300"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">偏好设置</span>
          </button>

          <button
            onClick={() => setIsWordBookOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:hover:bg-indigo-900/60 dark:text-indigo-400 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer relative"
          >
            <BookMarked className="h-4 w-4" />
            <span>我的生词本</span>
            {savedWords.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full h-4.5 w-4.5 text-[9px] font-black flex items-center justify-center scale-95 animate-pulse">
                {savedWords.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="lg:hidden p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900"
            title="实时语法翻译纠错"
          >
            {showMobileSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1550px] w-full mx-auto px-4 md:px-6 py-4 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 overflow-hidden">
          <div className="lg:col-span-3 flex flex-col h-full min-h-0 overflow-hidden">
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
              currentLevel={currentLevel}
              activeScenario={activeScenario}
              onResetChat={handleResetChat}
              inputRef={inputRef}
              inputText={inputText}
              setInputText={setInputText}
            />
          </div>

          <div className={`lg:col-span-1 h-full min-h-0 transition-all duration-300 ${
            showMobileSidebar ? "fixed inset-0 z-30 pt-16" : "hidden lg:block animate-fade-in"
          }`}>
            <AnalysisSidebar
              analysis={analysis}
              isLoading={isAnalysisLoading}
              onAddWord={addWord}
              savedWords={savedWords}
              onSelectSuggestion={handleSelectSuggestion}
              userMessageEmpty={inputText.trim() === ""}
            />
          </div>
        </div>
      </main>

      <WordBook
        isOpen={isWordBookOpen}
        onClose={() => setIsWordBookOpen(false)}
        wordList={savedWords}
        onRemoveWord={removeWord}
        onClearAll={handleClearAllWords}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentLevel={currentLevel}
        onLevelChange={handleLevelChange}
        activeScenario={activeScenario}
        onScenarioSelect={handleScenarioSelect}
        prefs={prefs}
        onSavePrefs={handleSavePrefs}
        serverConfig={serverConfig}
        configMismatch={configMismatch}
        onDismissMismatch={dismissMismatch}
      />
    </div>
  )
}
