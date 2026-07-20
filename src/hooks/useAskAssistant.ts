import { useCallback, useRef, useState } from 'react'
import type { AskContext, AskMessage } from '../types'
import { createMessageId } from '../lib/ids'
import { streamAsk } from '../lib/api'
import type { DifficultyLevel } from '../types'

export function useAskAssistant(args: { level: DifficultyLevel; modelId: string; maxContextMessages?: number }) {
  const { level, modelId, maxContextMessages } = args
  const [messages, setMessages] = useState<AskMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const ask = useCallback(async (question: string, context?: AskContext, options?: { resetHistory?: boolean }) => {
    const q = question.trim()
    if (!q || isLoading) return
    const userMsg: AskMessage = { id: createMessageId('ask-user'), role: 'user', content: q, timestamp: Date.now(), context }
    const assistantId = createMessageId('ask-assistant')
    const assistantMsg: AskMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now(), streaming: true }
    const completeHistory = messages
      .filter((message) => !message.streaming && message.content.trim())
      .map(({ role, content }) => ({ role, content }))
    const history = options?.resetHistory
      ? []
      : maxContextMessages === undefined
        ? completeHistory
        : completeHistory.slice(-maxContextMessages)
    setMessages((prev) => options?.resetHistory ? [userMsg, assistantMsg] : [...prev, userMsg, assistantMsg])
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamAsk(
        { question: q, level, context, history, model: modelId || undefined },
        {
          onDelta: (delta) => {
            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + delta } : m))
          },
          onDone: ({ isFallback }) => {
            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false, isFallback } : m))
          },
          onError: (msg) => {
            setMessages((prev) => prev.map((m) => m.id === assistantId
              ? { ...m, streaming: false, content: m.content || (msg === 'ASK_UPSTREAM_UNAVAILABLE'
                ? '这次 AI 没有返回有效的课程讲解，请稍后重试或切换模型。'
                : '答疑服务暂时不可用，请稍后重试。') }
              : m))
          },
        },
        controller.signal,
      )
    } catch (err) {
      const aborted = controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')
      setMessages((prev) => prev.map((m) => m.id === assistantId
        ? {
          ...m,
          streaming: false,
          content: aborted
            ? (m.content || '')
            : (m.content || '抱歉，答疑服务暂时不可用，请重试。'),
          isFallback: !aborted,
        }
        : m))
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [level, isLoading, maxContextMessages, messages, modelId])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setMessages((prev) => prev.map((m) => m.streaming ? { ...m, streaming: false } : m))
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
  }, [])

  return { messages, isLoading, ask, stop, reset }
}
