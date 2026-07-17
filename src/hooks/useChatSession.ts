// src/hooks/useChatSession.ts — moved from features/chat/
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sendAnalyze, streamChat } from '../lib/api'
import { createMessageId } from '../lib/ids'
import { incrementStoredCounter } from '../lib/storage'
import type { AnalysisHistoryEntry, AnalysisResult, DifficultyLevel, Message, Scenario } from '../types'

const CHAT_VARIETY_KEY = 'lingolevel_chat_variety'

function getStarterMessage(scenario: Scenario, diversitySeed: number): string {
  const index = scenario.id === 'free_chat'
    ? diversitySeed % scenario.starterMessages.length
    : Math.floor(Math.random() * scenario.starterMessages.length)
  return scenario.starterMessages[index]
}

function trimChatContext(messages: Message[], max?: number) {
  const context = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  return max === undefined ? context : context.slice(-max)
}

export function useChatSession(args: { currentLevel: DifficultyLevel; activeScenario: Scenario; maxContextMessages?: number; modelId: string }) {
  const { currentLevel, activeScenario, maxContextMessages, modelId } = args
  const [messages, setMessages] = useState<Message[]>([])
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryEntry[]>([])
  const [selectedAnalysisIndex, setSelectedAnalysisIndex] = useState(0)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
  const sessionIdRef = useRef(0)
  const diversitySeedRef = useRef(0)
  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const analysisQueueRef = useRef<Promise<void>>(Promise.resolve())
  const analysisAbortControllersRef = useRef(new Set<AbortController>())
  const pendingAnalysisIdsRef = useRef(new Set<string>())
  const analysisVersionRef = useRef(new Map<string, number>())
  const analysisControllerByMessageRef = useRef(new Map<string, AbortController>())

  const resetConversation = useCallback(async () => {
    abortRef.current?.abort()
    const sessionId = sessionIdRef.current + 1
    sessionIdRef.current = sessionId
    requestIdRef.current += 1
    const diversitySeed = activeScenario.id === 'free_chat' ? incrementStoredCounter(CHAT_VARIETY_KEY) : 0
    diversitySeedRef.current = diversitySeed
    analysisQueueRef.current = Promise.resolve()
    for (const controller of analysisAbortControllersRef.current) controller.abort()
    analysisAbortControllersRef.current.clear()
    pendingAnalysisIdsRef.current.clear()
    analysisVersionRef.current.clear()
    analysisControllerByMessageRef.current.clear()
    setMessages([{
      id: createMessageId('starter'),
      role: 'assistant',
      content: getStarterMessage(activeScenario, diversitySeed),
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

  const streamAssistantReply = useCallback(async (args: {
    contextMessages: Message[]
    assistantId: string
    sessionId: number
    requestId: number
    level: DifficultyLevel
  }): Promise<string | null> => {
    const { contextMessages, assistantId, sessionId, requestId, level } = args
    const controller = new AbortController()
    abortRef.current = controller
    let assistantContent = ''
    let isFallback = false

    try {
      await streamChat(
        {
          messages: trimChatContext(contextMessages, maxContextMessages),
          level,
          scenarioInfo: activeScenario.id === 'free_chat' ? null : activeScenario,
          model: modelId || undefined,
          diversitySeed: diversitySeedRef.current,
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
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return null
      if (sessionIdRef.current !== sessionId || requestIdRef.current !== requestId) return null
      console.error(err)
      setMessages((prev) => prev.map((m) => m.id === assistantId
        ? { ...m, streaming: false, content: '抱歉，当前 AI 服务暂时不可用，请稍后重试。', isFallback: true }
        : m))
      return null
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      if (sessionIdRef.current === sessionId && requestIdRef.current === requestId) {
        setIsChatLoading(false)
      }
    }
    return assistantContent || null
  }, [activeScenario, maxContextMessages, modelId])

  const enqueueAnalysis = useCallback((args: {
    entryId?: string
    userMessageId: string
    assistantMessageId: string
    userMessage: string
    assistantMessage: string
    level: DifficultyLevel
    scenarioContext?: string
    createdAt?: number
    sessionId: number
  }) => {
    const entryId = args.entryId ?? createMessageId('analysis')
    const taskId = createMessageId('analysis-task')
    const versionKey = args.assistantMessageId
    const version = (analysisVersionRef.current.get(versionKey) ?? 0) + 1
    analysisVersionRef.current.set(versionKey, version)
    analysisControllerByMessageRef.current.get(versionKey)?.abort()
    pendingAnalysisIdsRef.current.add(taskId)
    setIsAnalysisLoading(true)

    const runAnalysis = async () => {
      const controller = new AbortController()
      analysisAbortControllersRef.current.add(controller)
      analysisControllerByMessageRef.current.set(versionKey, controller)
      try {
        if (sessionIdRef.current !== args.sessionId || analysisVersionRef.current.get(versionKey) !== version) return
        const nextAnalysis = await sendAnalyze({
          userMessage: args.userMessage,
          assistantMessage: args.assistantMessage,
          level: args.level,
          model: modelId || undefined,
          scenarioContext: args.scenarioContext,
        }, controller.signal)
        if (sessionIdRef.current !== args.sessionId || analysisVersionRef.current.get(versionKey) !== version) return

        const historyEntry: AnalysisHistoryEntry = {
          id: entryId,
          userMessageId: args.userMessageId,
          assistantMessageId: args.assistantMessageId,
          userMessage: args.userMessage,
          assistantMessage: args.assistantMessage,
          level: args.level,
          scenarioContext: args.scenarioContext,
          analysis: nextAnalysis,
          createdAt: args.createdAt ?? Date.now(),
        }
        setAnalysis(nextAnalysis)
        setAnalysisHistory((prev) => {
          const existingIndex = prev.findIndex((entry) => entry.id === entryId)
          const next = existingIndex >= 0
            ? prev.map((entry, index) => index === existingIndex ? historyEntry : entry)
            : [...prev, historyEntry]
          setSelectedAnalysisIndex(existingIndex >= 0 ? existingIndex : next.length - 1)
          return next
        })
      } catch (err) {
        const aborted = controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')
        if (!aborted && sessionIdRef.current === args.sessionId) {
          console.error('Failed to analyze chat response', err)
        }
      } finally {
        analysisAbortControllersRef.current.delete(controller)
        if (analysisControllerByMessageRef.current.get(versionKey) === controller) {
          analysisControllerByMessageRef.current.delete(versionKey)
        }
        pendingAnalysisIdsRef.current.delete(taskId)
        if (sessionIdRef.current === args.sessionId) {
          setIsAnalysisLoading(pendingAnalysisIdsRef.current.size > 0)
        }
      }
    }
    analysisQueueRef.current = analysisQueueRef.current.then(runAnalysis, runAnalysis)
  }, [modelId])

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim()
    if (!userText || isChatLoading) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const sessionId = sessionIdRef.current
    const userId = createMessageId('user')
    const assistantId = createMessageId('assistant')
    const nextMessages: Message[] = [
      ...messages,
      { id: userId, role: 'user', content: userText, timestamp: Date.now() },
    ]
    setMessages([...nextMessages, {
      id: assistantId, role: 'assistant', content: '', timestamp: Date.now(), streaming: true,
    }])
    setIsChatLoading(true)

    const assistantContent = await streamAssistantReply({
      contextMessages: nextMessages, assistantId, sessionId, requestId, level: currentLevel,
    })
    if (!assistantContent || sessionIdRef.current !== sessionId) return

    enqueueAnalysis({
      userMessageId: userId,
      assistantMessageId: assistantId,
      userMessage: userText,
      assistantMessage: assistantContent,
      level: currentLevel,
      scenarioContext: activeScenario.id === 'free_chat'
        ? undefined
        : `${activeScenario.englishName} — ${activeScenario.description}`,
      sessionId,
    })
  }, [activeScenario, currentLevel, enqueueAnalysis, isChatLoading, messages, streamAssistantReply])

  const regeneratableAssistantId = useMemo(() => {
    const visible = messages.filter((message) => message.role !== 'system')
    const assistant = visible.at(-1)
    const user = visible.at(-2)
    return assistant?.role === 'assistant' && !assistant.streaming && user?.role === 'user'
      ? assistant.id
      : null
  }, [messages])

  const regenerateLastReply = useCallback(async () => {
    if (!regeneratableAssistantId || isChatLoading) return
    const assistantIndex = messages.findIndex((message) => message.id === regeneratableAssistantId)
    if (assistantIndex < 0) return
    let userIndex = assistantIndex - 1
    while (userIndex >= 0 && messages[userIndex].role === 'system') userIndex -= 1
    const userMessage = messages[userIndex]
    if (!userMessage || userMessage.role !== 'user') return

    const sessionId = sessionIdRef.current
    if (activeScenario.id === 'free_chat') {
      diversitySeedRef.current = incrementStoredCounter(CHAT_VARIETY_KEY)
    }
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const existingEntry = analysisHistory.find((entry) => entry.assistantMessageId === regeneratableAssistantId)
    const generationLevel = existingEntry?.level ?? currentLevel

    const nextVersion = (analysisVersionRef.current.get(regeneratableAssistantId) ?? 0) + 1
    analysisVersionRef.current.set(regeneratableAssistantId, nextVersion)
    analysisControllerByMessageRef.current.get(regeneratableAssistantId)?.abort()

    if (existingEntry) {
      const remaining = analysisHistory.filter((entry) => entry.id !== existingEntry.id)
      setAnalysisHistory(remaining)
      setSelectedAnalysisIndex(Math.max(0, remaining.length - 1))
      setAnalysis(remaining.at(-1)?.analysis ?? null)
    }

    setMessages((prev) => prev.map((message) => message.id === regeneratableAssistantId
      ? { ...message, content: '', streaming: true, isFallback: false, timestamp: Date.now() }
      : message))
    setIsChatLoading(true)

    const assistantContent = await streamAssistantReply({
      contextMessages: messages.slice(0, assistantIndex),
      assistantId: regeneratableAssistantId,
      sessionId,
      requestId,
      level: generationLevel,
    })
    if (!assistantContent || sessionIdRef.current !== sessionId) return

    enqueueAnalysis({
      entryId: existingEntry?.id,
      userMessageId: userMessage.id,
      assistantMessageId: regeneratableAssistantId,
      userMessage: userMessage.content,
      assistantMessage: assistantContent,
      level: generationLevel,
      scenarioContext: existingEntry?.scenarioContext ?? (activeScenario.id === 'free_chat'
        ? undefined
        : `${activeScenario.englishName} — ${activeScenario.description}`),
      createdAt: existingEntry?.createdAt,
      sessionId,
    })
  }, [activeScenario, analysisHistory, currentLevel, enqueueAnalysis, isChatLoading, messages, regeneratableAssistantId, streamAssistantReply])

  const retrySelectedAnalysis = useCallback(() => {
    if (isAnalysisLoading) return
    const entry = analysisHistory[selectedAnalysisIndex]
    if (!entry) return
    enqueueAnalysis({
      entryId: entry.id,
      userMessageId: entry.userMessageId ?? entry.id,
      assistantMessageId: entry.assistantMessageId ?? entry.id,
      userMessage: entry.userMessage,
      assistantMessage: entry.assistantMessage,
      level: entry.level ?? currentLevel,
      scenarioContext: entry.scenarioContext,
      createdAt: entry.createdAt,
      sessionId: sessionIdRef.current,
    })
  }, [analysisHistory, currentLevel, enqueueAnalysis, isAnalysisLoading, selectedAnalysisIndex])

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
    regeneratableAssistantId, regenerateLastReply, retrySelectedAnalysis,
    addSystemMessage, showPreviousAnalysis, showNextAnalysis, showLatestAnalysis,
  }
}
