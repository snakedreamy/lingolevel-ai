// src/components/AskAssistant.tsx — 答疑助手（非模态侧抽屉）
import { useEffect, useRef, useState } from 'react'
import { Send, RotateCcw, X } from './Icon'
import type { AskContext, AskMessage } from '../types'
import { renderMarkdown } from '../lib/markdown'
import { SideDrawer, useSpeech } from './ui'
import SpeechButton from './SpeechButton'

interface AskAssistantProps {
  isOpen: boolean
  onClose: () => void
  messages: AskMessage[]
  isLoading: boolean
  initialContext: AskContext | null
  onAsk: (question: string, context?: AskContext) => void
  onReset: () => void
  sendOnCtrlEnter?: boolean
}

export default function AskAssistant({ isOpen, onClose, messages, isLoading, initialContext, onAsk, onReset, sendOnCtrlEnter = false }: AskAssistantProps) {
  const speech = useSpeech()
  const [question, setQuestion] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [ctx, setCtx] = useState<AskContext | null>(initialContext)

  useEffect(() => { if (isOpen) setCtx(initialContext) }, [isOpen, initialContext])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])

  if (!isOpen) return null

  const submit = () => {
    if (!question.trim() || isLoading) return
    onAsk(question, ctx ?? undefined)
    setQuestion('')
  }

  const ctxLabel = ctx?.word ? `单词：${ctx.word}` : ctx?.sentence ? `句子：${ctx.sentence}` : ctx?.lessonTitle ? `课程：${ctx.lessonTitle}` : null

  return (
    <SideDrawer title="答疑助手" subtitle="问老师" onClose={onClose}
      actions={messages.length > 0 ? (
        <button onClick={onReset} title="清空答疑"
          className="ui-btn ui-btn-icon border-transparent hover:!text-scarlet dark:hover:!text-scarlet-dark">
          <RotateCcw className="h-4 w-4" />
        </button>
      ) : undefined}>
      <div ref={scrollRef} className="ui-scroll flex-1 space-y-5 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="margin-code mb-3">问老师</p>
            <p className="max-w-xs text-xs leading-5 ui-text-muted">直接提问，也可以带着当前课程、练习答案或对话句子继续追问。</p>
          </div>
        ) : messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'border-l ui-rule pl-3'}>
            <div className={m.role === 'user'
              ? 'max-w-[88%] border-r-2 border-scarlet pr-3 text-right dark:border-scarlet-dark'
              : 'max-w-full'}>
              {m.context && (m.context.word || m.context.sentence || m.context.lessonTitle) && (
                <div className="margin-code mb-1.5">
                  {m.context.word ? `单词：${m.context.word}` : m.context.sentence ? `句子：${m.context.sentence}` : `课程：${m.context.lessonTitle}`}
                </div>
              )}
              <div className={`break-words leading-relaxed ${m.role === 'user' ? 'font-body text-[13px]' : 'text-[13px] text-ink/90 dark:text-ink-dark/90'}`}>
                {m.content
                  ? (m.streaming ? (
                      <span className="whitespace-pre-wrap">{m.content}<span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse bg-scarlet align-middle dark:bg-scarlet-dark" /></span>
                    ) : renderMarkdown(m.content))
                  : (m.streaming ? <span className="inline-block h-3.5 w-1 animate-pulse bg-scarlet align-middle dark:bg-scarlet-dark" /> : null)}
              </div>
              {m.role === 'assistant' && m.content && !m.streaming && (
                <div className="mt-1.5">
                  <SpeechButton active={speech.activeId === `ask:${m.id}`}
                    onClick={() => speech.toggle(`ask:${m.id}`, m.content, '答疑回复')}
                    label="答疑回复" showText />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t ui-rule p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {ctxLabel && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-gilt/40 bg-gilt/10 px-2.5 py-1.5 text-[11px] ui-text-muted dark:border-gilt-dark/40 dark:bg-gilt-dark/10">
            <span className="truncate">已选上下文：{ctxLabel}</span>
            <button onClick={() => setCtx(null)} className="ui-text-faint hover:text-ink dark:hover:text-ink-dark"><X className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea rows={1} value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              const isSendCombo = sendOnCtrlEnter ? (e.ctrlKey || e.metaKey) : !e.shiftKey
              if (e.key === 'Enter' && isSendCombo) { e.preventDefault(); submit() }
            }}
            placeholder={"问：为什么这样用？能再举一个例子吗？" + (sendOnCtrlEnter ? ' (Ctrl+Enter 发送)' : '')}
            className="ui-input flex-1 resize-none px-3 py-2 text-[13px]" />
          <button onClick={submit} disabled={!question.trim() || isLoading}
            className={`flex items-center justify-center rounded-md px-3 ${!question.trim() || isLoading ? 'bg-ink/10 text-ink/35 dark:bg-ink-dark/15 dark:text-ink-dark/35' : 'bg-forest text-paper hover:bg-forest/90 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90'}`}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </SideDrawer>
  )
}
