// src/hooks/useAskPanel.ts — 答疑面板的打开状态与上下文入口
// App 创建一次并作为 render prop 传给各工作区，替代原先分散的
// isAskOpen / askContext / open / openAndAsk。
import { useCallback, useState } from 'react'
import type { AskContext } from '../types'
import { useAskAssistant } from './useAskAssistant'
import type { DifficultyLevel } from '../types'

export type AskSession = ReturnType<typeof useAskAssistant>

export interface AskPanel {
  isOpen: boolean
  context: AskContext | null
  session: AskSession
  /** Open with a snapshot of the page the learner is currently viewing. */
  open: (context?: AskContext | null) => void
  /** Open with page context and immediately ask in a fresh tutor thread. */
  openAndAsk: (context: AskContext, question: string) => void
  close: () => void
}

export function useAskPanel(args: { level: DifficultyLevel; modelId: string; maxContextMessages?: number }): AskPanel {
  const session = useAskAssistant(args)
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<AskContext | null>(null)

  const open = useCallback((next: AskContext | null = null) => {
    if (context?.scopeId !== next?.scopeId) session.reset()
    setContext(next)
    setIsOpen(true)
  }, [context?.scopeId, session])

  const openAndAsk = useCallback((lessonContext: AskContext, question: string) => {
    setContext(lessonContext)
    setIsOpen(true)
    void session.ask(question, lessonContext, { resetHistory: true })
  }, [session])

  const close = useCallback(() => setIsOpen(false), [])

  return { isOpen, context, session, open, openAndAsk, close }
}
