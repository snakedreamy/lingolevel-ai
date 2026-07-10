// src/hooks/useChatSession.ts — moved from features/chat/
import { useCallback, useEffect, useRef, useState } from 'react'
import { sendAnalyze, streamChat } from '../lib/api'
import { createMessageId } from '../lib/ids'
import type { AnalysisHistoryEntry, AnalysisResult, DifficultyLevel, Message, Scenario } from '../types'

function getStarterMessage(scenario: Scenario): string {
  return scenario.starterMessages[Math.floor(Math.random() * scenario.starterMessages.length)]
}

function trimChatContext(messages: Message[], max: number) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-max)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
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
  const abortRef = useRef<AbortController | null>(null)
  const analysisQueueRef = useRef<Promise<void>>(Promise.resolve())
  const analysisAbortControllersRef = useRef(new Set<AbortController>())
  const pendingAnalysisIdsRef = useRef(new Set<string>())

  const resetConversation = useCallback(async () => {
    abortRef.current?.abort()
    const sessionId = sessionIdRef.current + 1
    sessionIdRef.current = sessionId
    requestIdRef.current += 1
    analysisQueueRef.current = Promise.resolve()
    for (const controller of analysisAbortControllersRef.current) controller.abort()
    analysisAbortControllersRef.current.clear()
    pendingAnalysisIdsRef.current.clear()
    setMessages([{
      id: createMessageId('starter'),
      role: 'assistant',
      content: getStarterMessage(activeScenario),
      timestamp: Date.now(),
    }])
    setAnalysis(null)
    setAnalysisHistory([])
    setSelectedAnalysisIndex(0)
    setIsChatLoading(false)
    setIsAnalysisLoading(false)
  }, [activeScenario])

  useEffect(() => { void resetConversation() }, [activeScenario, resetConversation])

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { id: createMessageId('system'), role: 'system', content, timestamp: Date.now() }])
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isChatLoading) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const sessionId = sessionIdRef.current

    const nextMessages = [...messages, { id: createMessageId('user'), role: 'user' as const, content: text, timestamp: Date.now() }]
    setMessages(nextMessages)
    setIsChatLoading(true)

    const assistantId = createMessageId('assistant')
    setMessages((prev) => [...prev, {
      id: assistantId, role: 'assistant', content: '', timestamp: Date.now(), streaming: true,
    }])

    const controller = new AbortController()
    abortRef.current = controller

    let assistantContent = ''
    let isFallback = false
    try {
      await streamChat(
        {
          messages: trimChatContext(nextMessages, maxContextMessages),
          level: currentLevel,
          scenarioInfo: activeScenario.id === 'free_chat' ? null : activeScenario,
        },
        {
          onDelta: (delta) => {
            if (sessionIdRef.current !== sessionId || requestIdRef.current !== requestId) return
            assistantContent += delta
            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: assistantContent } : m))
          },
          onDone: ({ isFallback: fb, timestamp }) => {
            if (sessionIdRef.current !== sessionId || requestIdRef.current !== requestId) return
            isFallback = !!fb
            setMessages((prev) => prev.map((m) => m.id === assistantId
              ? { ...m, streaming: false, isFallback, timestamp: timestamp || m.timestamp } : m))
          },
          onError: () => {
            if (sessionIdRef.current !== sessionId || requestIdRef.current !== requestId) return
            setMessages((prev) => prev.map((m) => m.id === assistantId
              ? { ...m, streaming: false, content: m.content || '抱歉，当前 AI 服务暂时不可用，请稍后重试。', isFallback: true }
              : m))
          },
        },
        controller.signal,
      )
    } catch (err) {
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return
      if (sessionIdRef.current !== sessionId || requestIdRef.current !== requestId) return
      console.error(err)
      setAnalysis(null)
      setMessages((prev) => prev.map((m) => m.id === assistantId
        ? { ...m, streaming: false, content: '抱歉，当前 AI 服务暂时不可用，请稍后重试。', isFallback: true }
        : m))
      return
    } finally {
      if (sessionIdRef.current === sessionId && requestIdRef.current === requestId) setIsChatLoading(false)
    }

    if (!assistantContent) {
      return
    }

    const analysisId = createMessageId('analysis')
    const turnCreatedAt = Date.now()
    pendingAnalysisIdsRef.current.add(analysisId)
    setIsAnalysisLoading(true)

    // Analysis is background work. Keep chat responsive, but serialize analyses
    // so every completed turn is recorded in order instead of invalidating the
    // previous result when the learner sends the next message quickly.
    const runAnalysis = async () => {
      const controller = new AbortController()
      analysisAbortControllersRef.current.add(controller)
      try {
        if (sessionIdRef.current !== sessionId) return
        const nextAnalysis = await sendAnalyze({
          userMessage: text,
          assistantMessage: assistantContent,
          level: currentLevel,
          scenarioContext: activeScenario.id === 'free_chat'
            ? undefined
            : `${activeScenario.englishName} — ${activeScenario.description}`,
        }, controller.signal)
        if (sessionIdRef.current !== sessionId) return

        const historyEntry: AnalysisHistoryEntry = {
          id: analysisId,
          userMessage: text,
          assistantMessage: assistantContent,
          analysis: nextAnalysis,
          createdAt: turnCreatedAt,
        }
        setAnalysis(nextAnalysis)
        setAnalysisHistory((prev) => {
          const next = [...prev, historyEntry]
          setSelectedAnalysisIndex(next.length - 1)
          return next
        })
      } catch (err) {
        const aborted = controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')
        if (!aborted && sessionIdRef.current === sessionId) {
          console.error('Failed to analyze chat response', err)
        }
      } finally {
        analysisAbortControllersRef.current.delete(controller)
        pendingAnalysisIdsRef.current.delete(analysisId)
        if (sessionIdRef.current === sessionId) {
          setIsAnalysisLoading(pendingAnalysisIdsRef.current.size > 0)
        }
      }
    }
    analysisQueueRef.current = analysisQueueRef.current.then(runAnalysis, runAnalysis)
  }, [activeScenario, currentLevel, isChatLoading, maxContextMessages, messages])

  const showAnalysisAtIndex = useCallback((index: number) => {
    const entry = analysisHistory[index]
    if (!entry) return
    setSelectedAnalysisIndex(index)
    setAnalysis(entry.analysis)
  }, [analysisHistory])

  const showPreviousAnalysis = useCallback(() => {
    if (selectedAnalysisIndex > 0) showAnalysisAtIndex(selectedAnalysisIndex - 1)
  }, [selectedAnalysisIndex, showAnalysisAtIndex])

  const showNextAnalysis = useCallback(() => {
    if (selectedAnalysisIndex < analysisHistory.length - 1) showAnalysisAtIndex(selectedAnalysisIndex + 1)
  }, [analysisHistory.length, selectedAnalysisIndex, showAnalysisAtIndex])

  const showLatestAnalysis = useCallback(() => {
    if (analysisHistory.length > 0) showAnalysisAtIndex(analysisHistory.length - 1)
  }, [analysisHistory.length, showAnalysisAtIndex])

  return {
    messages, analysis, analysisHistory, selectedAnalysisIndex,
    isChatLoading, isAnalysisLoading, resetConversation, sendMessage,
    addSystemMessage, showPreviousAnalysis, showNextAnalysis, showLatestAnalysis,
  }
}
