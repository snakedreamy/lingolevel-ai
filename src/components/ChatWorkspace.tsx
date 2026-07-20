// src/components/ChatWorkspace.tsx — 会话工作区：对话 + 旁批反馈
// 会话状态（消息/分析历史）与输入草稿都收在这里；App 不再感知这些细节。
// 移动端反馈入口是右下角悬浮按钮（抽屉也是工作区自己渲染的），不占用页头。
import { useRef, useState } from 'react'
import { BookOpen } from './Icon'
import ChatWindow from './ChatWindow'
import AnalysisSidebar from './AnalysisSidebar'
import { BottomDrawer } from './ui'
import { useChatSession } from '../hooks/useChatSession'
import { LEVELS } from '../data/levels'
import type { BrowserPrefs, DifficultyLevel, Scenario } from '../types'
import type { AskPanel } from '../hooks/useAskPanel'

export default function ChatWorkspace({ prefs, setPrefs, activeScenario, modelId, maxContextMessages, ask }: {
  prefs: BrowserPrefs
  setPrefs: React.Dispatch<React.SetStateAction<BrowserPrefs>>
  activeScenario: Scenario
  modelId: string
  maxContextMessages?: number
  ask: AskPanel
}) {
  const chat = useChatSession({
    currentLevel: prefs.level,
    activeScenario,
    maxContextMessages,
    modelId,
  })
  const {
    messages, analysis, analysisHistory, selectedAnalysisIndex,
    isChatLoading, isAnalysisLoading, resetConversation, sendMessage, addSystemMessage,
    regeneratableAssistantId, regenerateLastReply, retrySelectedAnalysis,
    showPreviousAnalysis, showNextAnalysis, showLatestAnalysis,
  } = chat

  const [inputText, setInputText] = useState('')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const handleSendMessage = (text: string) => { void sendMessage(text); setInputText('') }
  const handleSelectSuggestion = (text: string) => { setInputText(text); inputRef.current?.focus() }
  const handleLevelChange = (level: DifficultyLevel) => {
    setPrefs((p) => ({ ...p, level }))
    const levelName = LEVELS.find((item) => item.id === level)?.name ?? level
    addSystemMessage(`⚙️ 难度调整为: ${levelName}`)
  }
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
    <div className="relative grid h-full min-h-0 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-4">
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
          onWordClick={ask.openWord}
          onSelectSentence={ask.openSentence}
          regeneratableAssistantId={regeneratableAssistantId}
          onRegenerateMessage={() => { void regenerateLastReply() }}
          sendOnCtrlEnter={prefs.sendOnCtrlEnter}
        />
      </div>
      <div className="hidden h-full min-h-0 animate-fade-in lg:col-span-1 lg:block">
        <AnalysisSidebar {...sidebarProps} />
      </div>

      {!showMobileSidebar && (
        <button type="button" onClick={() => setShowMobileSidebar(true)}
          className="ui-btn ui-sheet absolute bottom-4 right-4 z-20 !h-11 gap-2 !px-4 shadow-lg lg:hidden"
          aria-label="打开反馈面板">
          <BookOpen className="h-4 w-4" />
          旁批
        </button>
      )}

      {showMobileSidebar && (
        <BottomDrawer title="旁批 · 反馈与建议" onClose={() => setShowMobileSidebar(false)}>
          <AnalysisSidebar {...sidebarProps} embedded
            onSelectSuggestion={(text) => { handleSelectSuggestion(text); setShowMobileSidebar(false) }} />
        </BottomDrawer>
      )}
    </div>
  )
}
