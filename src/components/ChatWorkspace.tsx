// src/components/ChatWorkspace.tsx — 会话工作区：对话 + 旁批反馈
// 会话状态（消息/分析历史）与输入草稿都收在这里；App 不再感知这些细节。
// 移动端反馈入口放在对话工具栏，避免悬浮控件遮挡输入区；抽屉由工作区自己渲染。
import { useEffect, useMemo, useRef, useState } from 'react'
import ChatWindow from './ChatWindow'
import AnalysisSidebar from './AnalysisSidebar'
import { BottomDrawer } from './ui'
import { useChatSession } from '../hooks/useChatSession'
import type { AnalysisHistoryEntry, AskContext, AskFocusType, BrowserPrefs, Message, Scenario, ThinkingEffort } from '../types'
import type { AskPanel } from '../hooks/useAskPanel'

function buildChatAskContext(args: {
  messages: Message[]
  scenario: Scenario
  maxContextMessages?: number
  analysis?: AnalysisHistoryEntry
  focusType?: AskFocusType
  focusText?: string
  sourceMessage?: Message
}): AskContext {
  const visibleMessages = args.messages
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && message.content.trim())
  const recentMessages = args.maxContextMessages === undefined
    ? visibleMessages
    : visibleMessages.slice(-args.maxContextMessages)
  const lines = [
    `当前场景：${args.scenario.name}（${args.scenario.englishName}）`,
    `场景说明：${args.scenario.description}`,
    recentMessages.length
      ? `最近对话：\n${recentMessages.map((message) => `${message.role === 'user' ? '学习者' : 'AI 教师'}：${message.content}`).join('\n')}`
      : '最近对话：尚未开始',
  ]
  if (args.sourceMessage && !recentMessages.some((message) => message.id === args.sourceMessage?.id)) {
    lines.push(`选中内容所在的完整消息：\n${args.sourceMessage.role === 'user' ? '学习者' : 'AI 教师'}：${args.sourceMessage.content}`)
  }
  if (args.analysis) {
    lines.push(`当前旁批对应的对话：\n学习者：${args.analysis.userMessage}\nAI 教师：${args.analysis.assistantMessage}`)
    lines.push(`当前旁批：${JSON.stringify(args.analysis.analysis)}`)
  }
  const latestId = visibleMessages.at(-1)?.id ?? 'empty'
  const focusId = args.sourceMessage?.id ?? latestId
  return {
    scopeId: args.focusText
      ? `chat:${focusId}:${args.focusType}:${args.focusText}`
      : `chat:${latestId}:${args.analysis?.id ?? 'no-analysis'}`,
    source: 'chat',
    sourceLabel: `对话练习 · ${args.scenario.name}`,
    focusType: args.focusType,
    focusText: args.focusText,
    pageContent: lines.join('\n\n'),
  }
}

export default function ChatWorkspace({ prefs, activeScenario, modelId, thinkingEffort, maxContextMessages, ask, onPageContextChange }: {
  prefs: BrowserPrefs
  activeScenario: Scenario
  modelId: string
  thinkingEffort: ThinkingEffort
  maxContextMessages?: number
  ask: AskPanel
  onPageContextChange: (context: AskContext) => void
}) {
  const chat = useChatSession({
    currentLevel: prefs.level,
    activeScenario,
    maxContextMessages,
    modelId,
    thinkingEffort,
  })
  const {
    messages, analysis, analysisHistory, selectedAnalysisIndex, persistenceWarning,
    isChatLoading, isAnalysisLoading, resetConversation, sendMessage,
    regeneratableAssistantId, regenerateLastReply, retrySelectedAnalysis,
    showPreviousAnalysis, showNextAnalysis, showLatestAnalysis,
  } = chat

  const [inputText, setInputText] = useState('')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const selectedAnalysis = analysisHistory[selectedAnalysisIndex]
  const pageAskContext = useMemo(() => buildChatAskContext({
    messages,
    scenario: activeScenario,
    maxContextMessages,
    analysis: selectedAnalysis,
  }), [activeScenario, maxContextMessages, messages, selectedAnalysis])

  useEffect(() => onPageContextChange(pageAskContext), [onPageContextChange, pageAskContext])

  const handleSendMessage = (text: string) => { void sendMessage(text); setInputText('') }
  const handleSelectSuggestion = (text: string) => { setInputText(text); inputRef.current?.focus() }
  const handleResetChat = () => {
    if (window.confirm('确定要清空当前对话，重新开始吗？')) void resetConversation()
  }
  const openFocusedAsk = (focusType: 'word' | 'sentence', focusText: string, sourceMessage: Message) => {
    ask.open(buildChatAskContext({
      messages,
      scenario: activeScenario,
      maxContextMessages,
      analysis: selectedAnalysis,
      focusType,
      focusText,
      sourceMessage,
    }))
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
          onWordClick={(word, message) => openFocusedAsk('word', word, message)}
          onSelectSentence={(sentence, message) => openFocusedAsk('sentence', sentence, message)}
          regeneratableAssistantId={regeneratableAssistantId}
          onRegenerateMessage={() => { void regenerateLastReply() }}
          onOpenFeedback={() => setShowMobileSidebar(true)}
          sendOnCtrlEnter={prefs.sendOnCtrlEnter}
          persistenceWarning={persistenceWarning}
        />
      </div>
      <div className="hidden h-full min-h-0 animate-fade-in lg:col-span-1 lg:block">
        <AnalysisSidebar {...sidebarProps} />
      </div>

      {showMobileSidebar && (
        <BottomDrawer title="旁批 · 反馈与建议" onClose={() => setShowMobileSidebar(false)}>
          <AnalysisSidebar {...sidebarProps} embedded
            onSelectSuggestion={(text) => { handleSelectSuggestion(text); setShowMobileSidebar(false) }} />
        </BottomDrawer>
      )}
    </div>
  )
}
