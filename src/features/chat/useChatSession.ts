import { useCallback, useEffect, useRef, useState } from "react"
import { sendAnalyze, sendChat } from "../../lib/api"
import { createMessageId } from "../../lib/ids"
import type { AnalysisResult, DifficultyLevel, Message, Scenario } from "../../types"

const MAX_CONTEXT_MESSAGES = 12

function getStarterMessage(scenario: Scenario): string {
  return scenario.starterMessages[Math.floor(Math.random() * scenario.starterMessages.length)]
}

function trimChatContext(messages: Message[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }))
}

export function useChatSession(args: { currentLevel: DifficultyLevel; activeScenario: Scenario }) {
  const { currentLevel, activeScenario } = args
  const [messages, setMessages] = useState<Message[]>([])
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
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
    setIsChatLoading(false)
    setIsAnalysisLoading(true)

    try {
      const nextAnalysis = await sendAnalyze({
        userMessage: "",
        assistantMessage: starterEnglish,
        level: currentLevel,
      })
      if (sessionIdRef.current !== sessionId) return
      setAnalysis(nextAnalysis)
    } catch (err) {
      if (sessionIdRef.current !== sessionId) return
      console.error("Failed to analyze starter message", err)
      setAnalysis(null)
    } finally {
      if (sessionIdRef.current === sessionId) {
        setIsAnalysisLoading(false)
      }
    }
  }, [activeScenario, currentLevel])

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
          messages: trimChatContext(nextMessages),
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
        setAnalysis(nextAnalysis)
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
    [activeScenario, currentLevel, isChatLoading, messages],
  )

  return {
    messages,
    analysis,
    isChatLoading,
    isAnalysisLoading,
    resetConversation,
    sendMessage,
    setAnalysis,
    addSystemMessage,
  }
}
