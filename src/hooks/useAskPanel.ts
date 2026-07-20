// src/hooks/useAskPanel.ts — 答疑面板的打开状态与上下文入口
// App 创建一次并作为 render prop 传给各工作区，替代原先分散的
// isAskOpen / askContext / openAskWithWord / openAskWithSentence / openAskWithLesson。
import { useCallback, useState } from 'react'
import type { AskContext } from '../types'
import { useAskAssistant } from './useAskAssistant'
import type { DifficultyLevel } from '../types'

export type AskSession = ReturnType<typeof useAskAssistant>

export interface AskPanel {
  isOpen: boolean
  context: AskContext | null
  session: AskSession
  /** 打开空上下文答疑。 */
  open: () => void
  /** 带单词上下文打开。 */
  openWord: (word: string) => void
  /** 带句子上下文打开。 */
  openSentence: (sentence: string) => void
  /** 带课程/答题上下文打开，并立即以新会话提问。 */
  openLesson: (context: AskContext, question: string) => void
  close: () => void
}

export function useAskPanel(args: { level: DifficultyLevel; modelId: string; maxContextMessages?: number }): AskPanel {
  const session = useAskAssistant(args)
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<AskContext | null>(null)

  const openWith = useCallback((next: AskContext | null) => {
    setContext(next)
    setIsOpen(true)
  }, [])

  const open = useCallback(() => openWith(null), [openWith])
  const openWord = useCallback((word: string) => openWith({ word }), [openWith])
  const openSentence = useCallback((sentence: string) => openWith({ sentence }), [openWith])
  const openLesson = useCallback((lessonContext: AskContext, question: string) => {
    openWith(lessonContext)
    void session.ask(question, lessonContext, { resetHistory: true })
  }, [openWith, session])

  const close = useCallback(() => setIsOpen(false), [])

  return { isOpen, context, session, open, openWord, openSentence, openLesson, close }
}
