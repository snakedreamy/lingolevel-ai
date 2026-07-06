import type { Dispatch, RefObject, SetStateAction } from "react"
import ChatWindow from "../components/ChatWindow"
import SettingsModal from "../components/SettingsModal"
import WordBook from "../components/WordBook"
import { LEVELS } from "../data/levels"
import type { ServerConfig } from "../lib/api"
import type { BrowserPrefs, DifficultyLevel, Message, Scenario, AnalysisResult, WordItem } from "../types"
import AppHeader from "./AppHeader"
import AnalysisSidebar from "../components/AnalysisSidebar"
import MobileAnalysisDrawer from "./MobileAnalysisDrawer"

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
  isChatLoading: boolean
  isAnalysisLoading: boolean
  resetConversation: () => Promise<void>
  sendMessage: (text: string) => Promise<void>
  addSystemMessage: (content: string) => void
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
  serverConfig: ServerConfig | null
  wordBook: WordBookState
  chat: ChatSessionState
}

export default function AppShell({
  prefs,
  setPrefs,
  currentLevel,
  activeScenario,
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
  wordBook,
  chat,
}: AppShellProps) {
  const { savedWords, addWord, removeWord, clearAllWords, hasWord } = wordBook
  const { messages, analysis, isChatLoading, isAnalysisLoading, resetConversation, sendMessage, addSystemMessage } = chat

  const handleScenarioSelect = (scenario: Scenario) => {
    setPrefs((p) => ({ ...p, scenarioId: scenario.id }))
  }

  const handleLevelChange = (level: DifficultyLevel) => {
    setPrefs((p) => ({ ...p, level }))
    const levelName = LEVELS.find((item) => item.id === level)?.name || level
    addSystemMessage(`⚙️ 难度成功调整为: ${levelName} | 下一轮发言 AI 将自动调频适配该难度`)
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

      <AppHeader
        theme={prefs.theme}
        savedWordsCount={savedWords.length}
        showMobileSidebar={showMobileSidebar}
        onToggleTheme={() => setPrefs((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenWordBook={() => setIsWordBookOpen(true)}
        onToggleMobileSidebar={() => setShowMobileSidebar((prev) => !prev)}
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
            />
          </div>

          <div className="hidden lg:block lg:col-span-1 h-full min-h-0 animate-fade-in">
            <AnalysisSidebar
              analysis={analysis}
              isLoading={isAnalysisLoading}
              onAddWord={addWord}
              isWordSaved={hasWord}
              onSelectSuggestion={handleSelectSuggestion}
            />
          </div>
        </div>
      </main>

      {showMobileSidebar && (
        <MobileAnalysisDrawer
          analysis={analysis}
          isLoading={isAnalysisLoading}
          onAddWord={addWord}
          isWordSaved={hasWord}
          onSelectSuggestion={handleSelectSuggestion}
          onClose={() => setShowMobileSidebar(false)}
        />
      )}

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
        serverConfig={serverConfig}
      />
    </div>
  )
}
