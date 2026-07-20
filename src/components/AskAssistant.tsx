import { useEffect, useRef, useState } from 'react'
import { X, Send, RotateCcw } from './Icon'
import type { AskContext, AskMessage } from '../types'
import type { SpeechPlayer } from '../lib/speech'
import { renderMarkdown } from '../lib/markdown'
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
  speech: SpeechPlayer
}

export default function AskAssistant({ isOpen, onClose, messages, isLoading, initialContext, onAsk, onReset, sendOnCtrlEnter = false, speech }: AskAssistantProps) {
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
    // 非模态：抽屉悬浮在右侧，不遮罩/模糊主聊天区，点击外部不关闭，
    // 用户可一边看主对话一边答疑。pointer-events-none 让外层不拦截主区点击，
    // 内层抽屉 pointer-events-auto 重新启用交互。
    <div className="pointer-events-none fixed inset-0 z-40 flex justify-end animate-fade-in">
      <aside role="complementary" aria-labelledby="ask-assistant-title"
        className="pointer-events-auto flex h-full w-full max-w-md flex-col border-l-2 border-ink bg-paper shadow-2xl dark:border-ink-dark dark:bg-paper-dark">
        <div className="flex items-center justify-between border-b border-ink/15 px-4 py-3 dark:border-ink-dark/20">
          <div className="flex items-baseline gap-2.5">
            <h2 id="ask-assistant-title" className="font-display text-base font-semibold text-ink dark:text-ink-dark">答疑助手</h2>
            <span className="margin-code">问老师</span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={onReset} title="清空答疑" className="rounded-md p-2 text-ink/45 hover:bg-ink/5 hover:text-scarlet dark:text-ink-dark/45 dark:hover:bg-ink-dark/10 dark:hover:text-scarlet-dark"><RotateCcw className="h-4 w-4" /></button>
            )}
            <button onClick={onClose} aria-label="关闭" className="cursor-pointer rounded-md p-2 text-ink/45 hover:bg-ink/5 hover:text-ink dark:text-ink-dark/45 dark:hover:bg-ink-dark/10 dark:hover:text-ink-dark"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="margin-code mb-3">问老师</p>
              <p className="max-w-xs text-xs leading-5 text-ink/50 dark:text-ink-dark/50">直接提问，也可以带着当前课程、练习答案或对话句子继续追问。</p>
            </div>
          ) : messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'border-l border-ink/15 pl-3 dark:border-ink-dark/20'}>
              <div className={m.role === 'user'
                ? 'max-w-[88%] border-r-2 border-scarlet pr-3 text-right dark:border-scarlet-dark'
                : 'max-w-full'}>
                {m.context && (m.context.word || m.context.sentence || m.context.lessonTitle) && (
                  <div className={`mb-1.5 text-[10px] ${m.role === 'user' ? 'margin-code' : 'margin-code !text-ink/50 dark:!text-ink-dark/50'}`}>
                    {m.context.word ? `单词：${m.context.word}` : m.context.sentence ? `句子：${m.context.sentence}` : `课程：${m.context.lessonTitle}`}
                  </div>
                )}
                <div className={`break-words leading-relaxed ${m.role === 'user' ? 'font-body text-[13px] text-ink dark:text-ink-dark' : 'text-[13px] text-ink/90 dark:text-ink-dark/90'}`}>
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

        <div className="border-t border-ink/15 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-ink-dark/20">
          {ctxLabel && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-gilt/40 bg-gilt/10 px-2.5 py-1.5 text-[11px] text-ink/70 dark:border-gilt-dark/40 dark:bg-gilt-dark/10 dark:text-ink-dark/70">
              <span className="truncate">已选上下文：{ctxLabel}</span>
              <button onClick={() => setCtx(null)} className="text-ink/40 hover:text-ink/70 dark:text-ink-dark/40 dark:hover:text-ink-dark/70"><X className="h-3 w-3" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea rows={1} value={question} onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                const isSendCombo = sendOnCtrlEnter ? (e.ctrlKey || e.metaKey) : !e.shiftKey
                if (e.key === 'Enter' && isSendCombo) { e.preventDefault(); submit() }
              }}
              placeholder={"问：为什么这样用？能再举一个例子吗？" + (sendOnCtrlEnter ? ' (Ctrl+Enter 发送)' : '')}
              className="flex-1 resize-none rounded-md border border-ink/20 bg-leaf px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-forest focus:ring-1 focus:ring-forest/40 dark:border-ink-dark/25 dark:bg-leaf-dark dark:text-ink-dark dark:placeholder:text-ink-dark/35 dark:focus:border-forest-dark" />
            <button onClick={submit} disabled={!question.trim() || isLoading}
              className={`flex items-center justify-center rounded-md px-3 ${!question.trim() || isLoading ? 'bg-ink/10 text-ink/35 dark:bg-ink-dark/15 dark:text-ink-dark/35' : 'bg-forest text-paper hover:bg-forest/90 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90'}`}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
