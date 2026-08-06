// src/hooks/useChatSession.ts — moved from features/chat/
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sendAnalyze, streamChat } from '../lib/api'
import { createMessageId } from '../lib/ids'
import { hasOrphanedUserMessage, removeOldestChatTurn, trimChatSessionToBudget } from '../lib/chatSessionStorage'
import type { StoredChatSession } from '../lib/chatSessionStorage'
import { incrementStoredCounter, isStoredRecord, loadStoredJson, saveStoredJson } from '../lib/storage'
import type { AnalysisHistoryEntry, AnalysisResult, DifficultyLevel, Message, Scenario, ThinkingEffort } from '../types'
import { isDifficultyLevel } from '../types'

const CHAT_VARIETY_KEY = 'lingolevel_chat_variety'
const CHAT_SESSION_KEY = 'lingolevel_chat_session_v1'

function isText(value: unknown): value is string {
  return typeof value === 'string'
}

function isTextArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isText)
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!isStoredRecord(value) || !isText(value.translation) || !Array.isArray(value.grammarCorrections)
    || !isStoredRecord(value.assistantReplyInsight) || !Array.isArray(value.keyWords) || !isTextArray(value.suggestions)) return false
  const insight = value.assistantReplyInsight
  return value.grammarCorrections.every((item) => isStoredRecord(item)
      && isText(item.original) && isText(item.corrected) && isText(item.explanation)
      && (item.politeForm === undefined || isText(item.politeForm))
      && typeof item.score === 'number' && Number.isFinite(item.score))
    && isText(insight.structure) && isText(insight.grammar) && isText(insight.whyThisReply)
    && value.keyWords.every((item) => isStoredRecord(item)
      && isText(item.word) && isText(item.phonetic) && isText(item.definition)
      && isText(item.exampleEn) && isText(item.exampleZh))
    && (value.isFallback === undefined || typeof value.isFallback === 'boolean')
}

function storedMessage(value: unknown): Message | null {
  if (!isStoredRecord(value) || !isText(value.id) || !isText(value.content)
    || (value.role !== 'user' && value.role !== 'assistant' && value.role !== 'system')
    || typeof value.timestamp !== 'number' || !Number.isFinite(value.timestamp)) return null
  return {
    id: value.id,
    role: value.role,
    content: value.content,
    timestamp: value.timestamp,
    translation: isText(value.translation) ? value.translation : undefined,
    pronunciation: isText(value.pronunciation) ? value.pronunciation : undefined,
    isFallback: value.isFallback === true,
  }
}

function storedAnalysisEntry(value: unknown): AnalysisHistoryEntry | null {
  if (!isStoredRecord(value) || !isText(value.id) || !isText(value.userMessage)
    || !isText(value.assistantMessage) || !isAnalysisResult(value.analysis)
    || typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt)) return null
  return {
    id: value.id,
    userMessageId: isText(value.userMessageId) ? value.userMessageId : undefined,
    assistantMessageId: isText(value.assistantMessageId) ? value.assistantMessageId : undefined,
    userMessage: value.userMessage,
    assistantMessage: value.assistantMessage,
    level: isDifficultyLevel(value.level) ? value.level : undefined,
    scenarioContext: isText(value.scenarioContext) ? value.scenarioContext : undefined,
    analysis: value.analysis,
    createdAt: value.createdAt,
  }
}

function loadChatSession(scenarioId: string): StoredChatSession | null {
  const value = loadStoredJson<unknown>(CHAT_SESSION_KEY, null)
  if (!isStoredRecord(value) || value.version !== 1 || value.scenarioId !== scenarioId
    || !Array.isArray(value.messages) || !Array.isArray(value.analysisHistory)) return null
  const messages = value.messages.map(storedMessage)
  const analysisHistory = value.analysisHistory.map(storedAnalysisEntry)
  if (messages.some((item) => !item) || analysisHistory.some((item) => !item)) return null
  const normalizedMessages = messages as Message[]
  if (hasOrphanedUserMessage(normalizedMessages)) return null
  const selectedIndex = typeof value.selectedAnalysisIndex === 'number' && Number.isSafeInteger(value.selectedAnalysisIndex)
    ? Math.min(Math.max(0, value.selectedAnalysisIndex), Math.max(0, analysisHistory.length - 1))
    : Math.max(0, analysisHistory.length - 1)
  return trimChatSessionToBudget({
    version: 1,
    scenarioId,
    diversitySeed: typeof value.diversitySeed === 'number' && Number.isSafeInteger(value.diversitySeed) && value.diversitySeed >= 0
      ? value.diversitySeed
      : 0,
    messages: normalizedMessages,
    analysisHistory: analysisHistory as AnalysisHistoryEntry[],
    selectedAnalysisIndex: selectedIndex,
  }).session
}

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

export function useChatSession(args: { currentLevel: DifficultyLevel; activeScenario: Scenario; maxContextMessages?: number; modelId: string; thinkingEffort: ThinkingEffort }) {
  const { currentLevel, activeScenario, maxContextMessages, modelId, thinkingEffort } = args
  const [initialSession] = useState(() => loadChatSession(activeScenario.id))
  const [messages, setMessages] = useState<Message[]>(() => initialSession?.messages ?? [])
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryEntry[]>(() => initialSession?.analysisHistory ?? [])
  const [selectedAnalysisIndex, setSelectedAnalysisIndex] = useState(() => initialSession?.selectedAnalysisIndex ?? 0)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() =>
    initialSession?.analysisHistory[initialSession.selectedAnalysisIndex]?.analysis ?? null)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null)
  const sessionIdRef = useRef(0)
  const diversitySeedRef = useRef(initialSession?.diversitySeed ?? 0)
  const scenarioIdRef = useRef(activeScenario.id)
  const skipPersistenceRef = useRef(false)
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
    setPersistenceWarning(null)
  }, [activeScenario])

  useEffect(() => {
    if (scenarioIdRef.current === activeScenario.id && messages.length > 0) return
    scenarioIdRef.current = activeScenario.id
    skipPersistenceRef.current = true
    void resetConversation()
  }, [activeScenario.id, messages.length, resetConversation])

  const messagePersistenceRevision = messages
    .map((message) => message.streaming
      ? `${message.id}:pending`
      : `${message.id}:${message.timestamp}:${message.content.length}:${message.isFallback ? 1 : 0}`)
    .join('|')
  useEffect(() => {
    if (skipPersistenceRef.current) {
      skipPersistenceRef.current = false
      return
    }
    const hasStreamingMessage = messages.some((message) => message.streaming)
    if (hasStreamingMessage) return
    const stableMessages = messages
    const initial = trimChatSessionToBudget({
      version: 1,
      scenarioId: activeScenario.id,
      diversitySeed: diversitySeedRef.current,
      messages: stableMessages,
      analysisHistory,
      selectedAnalysisIndex: Math.min(selectedAnalysisIndex, Math.max(0, analysisHistory.length - 1)),
    })
    let candidate = initial.session
    let saved = initial.fits && saveStoredJson(CHAT_SESSION_KEY, candidate)
    while (!saved) {
      const smaller = removeOldestChatTurn(candidate)
      if (!smaller) break
      candidate = smaller
      saved = saveStoredJson(CHAT_SESSION_KEY, candidate)
    }

    if (!saved) {
      setPersistenceWarning('浏览器无法保存当前对话，刷新页面后本次内容可能丢失。')
      return
    }
    setPersistenceWarning(null)

    const historyChanged = candidate.analysisHistory.length !== analysisHistory.length
      || candidate.analysisHistory[0]?.id !== analysisHistory[0]?.id
    const messagesChanged = candidate.messages.length !== stableMessages.length
      || candidate.messages[0]?.id !== stableMessages[0]?.id
    if (historyChanged || messagesChanged) {
      setMessages(candidate.messages)
      setAnalysisHistory(candidate.analysisHistory)
      setSelectedAnalysisIndex(candidate.selectedAnalysisIndex)
      setAnalysis(candidate.analysisHistory[candidate.selectedAnalysisIndex]?.analysis ?? null)
    }
  }, [activeScenario.id, analysisHistory, messagePersistenceRevision, selectedAnalysisIndex])

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
          thinkingEffort: thinkingEffort || undefined,
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
  }, [activeScenario, maxContextMessages, modelId, thinkingEffort])

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
          thinkingEffort: thinkingEffort || undefined,
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
  }, [modelId, thinkingEffort])

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
    messages, analysis, analysisHistory, selectedAnalysisIndex, persistenceWarning,
    isChatLoading, isAnalysisLoading, resetConversation, sendMessage,
    regeneratableAssistantId, regenerateLastReply, retrySelectedAnalysis,
    showPreviousAnalysis, showNextAnalysis, showLatestAnalysis,
  }
}
