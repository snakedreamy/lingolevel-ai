import { useCallback, useEffect, useRef, useState } from "react"
import { sendAnalyze, sendChat } from "../../lib/api"
import { createMessageId } from "../../lib/ids"
import type { AnalysisHistoryEntry, AnalysisResult, DifficultyLevel, Message, Scenario } from "../../types"

function getStarterMessage(scenario: Scenario): string {
  return scenario.starterMessages[Math.floor(Math.random() * scenario.starterMessages.length)]
}

function trimChatContext(messages: Message[], maxContextMessages: number) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-maxContextMessages)
    .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }))
}

export function useChatSession(args: { currentLevel: DifficultyLevel; activeScenario: Scenario; maxContextMessages: number }) {
  const { currentLevel, activeScenario, maxContextMessages } = args
  const [messages, setMessages] = useState<Message[]>([])
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryEntry[]>([])
  const [selectedAnalysisIndex, setSelectedAnalysisIndex] = useState(0)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
  const sessionIdRef = useRef(0)
  const requestIdRef = useRef(0)

  const resetConversation = useCallback(async () => {
    const sessionId = sessionIdRef.current + 1
    sessionIdRef.current = sessionId
    requestIdRef.current += 1

    const starterEnglish = getStarterMessage(activeScenario)
    const starterMessage: Message = {
      id: createMessageId("starter"),
      role: "assistant",
      content: starterEnglish,
      timestamp: Date.now(),
    }

    setMessages([starterMessage])
    setAnalysis(null)
    setAnalysisHistory([])
    setSelectedAnalysisIndex(0)
    setIsChatLoading(false)
    setIsAnalysisLoading(false)
  }, [activeScenario])

  useEffect(() => {
    void resetConversation()
  }, [activeScenario, resetConversation])

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId("level-notice"),
        role: "system",
        content,
        timestamp: Date.now(),
      },
    ])
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isChatLoading) return

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      const sessionId = sessionIdRef.current

      const userMessage: Message = {
        id: createMessageId("user"),
        role: "user",
        content: text,
        timestamp: Date.now(),
      }

      const nextMessages = [...messages, userMessage]
      setMessages(nextMessages)
      setIsChatLoading(true)
      setIsAnalysisLoading(true)

      let assistantContent: string | null = null

      try {
        const chatResult = await sendChat({
          messages: trimChatContext(nextMessages, maxContextMessages),
          level: currentLevel,
          scenarioInfo: activeScenario.id === "free_chat" ? null : activeScenario,
        })

        if (sessionIdRef.current !== sessionId || requestIdRef.current !== requestId) {
          return
        }

        assistantContent = chatResult.content

        const assistantMessage: Message = {
          id: createMessageId("assistant"),
          role: "assistant",
          content: chatResult.content,
          timestamp: chatResult.timestamp || Date.now(),
          isFallback: !!chatResult.isFallback,
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        if (sessionIdRef.current !== sessionId || requestIdRef.current !== requestId) {
          return
        }

        console.error(err)
        setAnalysis(null)
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId("error"),
            role: "assistant",
            content: "抱歉，当前 AI 服务暂时不可用。您可以稍后重试，或先继续练习下一句。",
            timestamp: Date.now(),
            isFallback: true,
          },
        ])
        setIsAnalysisLoading(false)
        return
      } finally {
        if (sessionIdRef.current === sessionId && requestIdRef.current === requestId) {
          setIsChatLoading(false)
        }
      }

      if (assistantContent === null) {
        if (sessionIdRef.current === sessionId && requestIdRef.current === requestId) {
          setIsAnalysisLoading(false)
        }
        return
      }

      try {
        const nextAnalysis = await sendAnalyze({
          userMessage: text,
          assistantMessage: assistantContent,
          level: currentLevel,
        })
        if (sessionIdRef.current !== sessionId || requestIdRef.current !== requestId) {
          return
        }

        const historyEntry: AnalysisHistoryEntry = {
          id: createMessageId("analysis"),
          userMessage: text,
          assistantMessage: assistantContent,
          analysis: nextAnalysis,
          createdAt: Date.now(),
        }

        setAnalysis(nextAnalysis)
        setAnalysisHistory((prev) => {
          const nextHistory = [...prev, historyEntry]
          setSelectedAnalysisIndex(nextHistory.length - 1)
          return nextHistory
        })
      } catch (err) {
        if (sessionIdRef.current !== sessionId || requestIdRef.current !== requestId) {
          return
        }
        console.error("Failed to analyze chat response", err)
      } finally {
        if (sessionIdRef.current === sessionId && requestIdRef.current === requestId) {
          setIsAnalysisLoading(false)
        }
      }
    },
    [activeScenario, currentLevel, isChatLoading, maxContextMessages, messages],
  )

  const showAnalysisAtIndex = useCallback(
    (index: number) => {
      const entry = analysisHistory[index]
      if (!entry) return
      setSelectedAnalysisIndex(index)
      setAnalysis(entry.analysis)
    },
    [analysisHistory],
  )

  const showPreviousAnalysis = useCallback(() => {
    if (selectedAnalysisIndex <= 0) return
    showAnalysisAtIndex(selectedAnalysisIndex - 1)
  }, [selectedAnalysisIndex, showAnalysisAtIndex])

  const showNextAnalysis = useCallback(() => {
    if (selectedAnalysisIndex >= analysisHistory.length - 1) return
    showAnalysisAtIndex(selectedAnalysisIndex + 1)
  }, [analysisHistory.length, selectedAnalysisIndex, showAnalysisAtIndex])

  const showLatestAnalysis = useCallback(() => {
    if (analysisHistory.length === 0) return
    showAnalysisAtIndex(analysisHistory.length - 1)
  }, [analysisHistory.length, showAnalysisAtIndex])

  return {
    messages,
    analysis,
    analysisHistory,
    selectedAnalysisIndex,
    isChatLoading,
    isAnalysisLoading,
    resetConversation,
    sendMessage,
    addSystemMessage,
    showPreviousAnalysis,
    showNextAnalysis,
    showLatestAnalysis,
  }
}
