import { useCallback, useEffect, useState } from "react"
import { sendAnalyze, sendChat } from "../../lib/api"
import { createMessageId } from "../../lib/ids"
import type { AnalysisResult, DifficultyLevel, Message, Scenario } from "../../types"

function getStarterMessage(scenario: Scenario): string {
  return scenario.starterMessages[Math.floor(Math.random() * scenario.starterMessages.length)]
}

export function useChatSession(args: { currentLevel: DifficultyLevel; activeScenario: Scenario }) {
  const { currentLevel, activeScenario } = args
  const [messages, setMessages] = useState<Message[]>([])
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)

  const resetConversation = useCallback(async () => {
    const starterEnglish = getStarterMessage(activeScenario)
    const starterMessage: Message = {
      id: createMessageId("starter"),
      role: "assistant",
      content: starterEnglish,
      timestamp: Date.now(),
    }

    setMessages([starterMessage])
    setIsAnalysisLoading(true)

    try {
      const nextAnalysis = await sendAnalyze({
        userMessage: "",
        assistantMessage: starterEnglish,
        level: currentLevel,
      })
      setAnalysis(nextAnalysis)
    } catch (err) {
      console.error("Failed to analyze starter message", err)
      setAnalysis(null)
    } finally {
      setIsAnalysisLoading(false)
    }
  }, [activeScenario, currentLevel])

  useEffect(() => {
    // Intentionally reset only when the scenario changes. Level changes are handled by
    // the caller with a system notice so existing chat history is preserved.
    void resetConversation()
  }, [activeScenario])

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
          messages: nextMessages
            .filter((message) => message.role === "user" || message.role === "assistant")
            .map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
          level: currentLevel,
          scenarioInfo: activeScenario.id === "free_chat" ? null : activeScenario,
        })

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
        console.error(err)
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId("error"),
            role: "assistant",
            content:
              "抱歉，AI 服务暂时无响应。请检查服务器的 .env.local 中 PROVIDER 和对应的 API 密钥是否正确配置，并确认网络连接正常。",
            timestamp: Date.now(),
          },
        ])
        setIsAnalysisLoading(false)
        return
      } finally {
        setIsChatLoading(false)
      }

      if (assistantContent === null) {
        setIsAnalysisLoading(false)
        return
      }

      try {
        const nextAnalysis = await sendAnalyze({
          userMessage: text,
          assistantMessage: assistantContent,
          level: currentLevel,
        })
        setAnalysis(nextAnalysis)
      } catch (err) {
        console.error("Failed to analyze chat response", err)
      } finally {
        setIsAnalysisLoading(false)
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
