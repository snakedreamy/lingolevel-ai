import { useEffect, useRef, useState } from 'react'
import { HelpCircle, X, Send, RotateCcw } from 'lucide-react'
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
    setCtx(null)
  }

  const ctxLabel = ctx?.word ? `单词：${ctx.word}` : ctx?.sentence ? `句子：${ctx.sentence}` : null

  return (
    // 非模态：抽屉悬浮在右侧，不遮罩/模糊主聊天区，点击外部不关闭，
    // 用户可一边看主对话一边答疑。pointer-events-none 让外层不拦截主区点击，
    // 内层抽屉 pointer-events-auto 重新启用交互。
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none animate-fade-in">
      <aside role="complementary" aria-labelledby="ask-assistant-title"
        className="h-full w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col pointer-events-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 p-2 text-indigo-600 dark:text-indigo-400"><HelpCircle className="h-5 w-5" /></div>
            <h2 id="ask-assistant-title" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">答疑助手</h2>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={onReset} title="清空答疑" className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><RotateCcw className="h-4 w-4" /></button>
            )}
            <button onClick={onClose} aria-label="关闭" className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400">
              <HelpCircle className="h-10 w-10 mb-3" />
              <p className="max-w-xs text-xs leading-5">直接提问，或从对话中的单词、句子发起答疑。</p>
            </div>
          ) : messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none'}`}>
                {m.context && (m.context.word || m.context.sentence) && (
                  <div className={`mb-1.5 text-[10px] px-1.5 py-0.5 rounded ${m.role === 'user' ? 'bg-indigo-500/40' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'}`}>
                    {m.context.word ? `单词：${m.context.word}` : `句子：${m.context.sentence}`}
                  </div>
                )}
                <div className="break-words">
                  {m.content
                    ? (m.streaming ? (
                        <span className="whitespace-pre-wrap">{m.content}<span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current animate-pulse align-middle" /></span>
                      ) : renderMarkdown(m.content))
                    : (m.streaming ? <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current animate-pulse align-middle" /> : null)}
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

        <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {ctxLabel && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
              <span className="truncate">已选上下文：{ctxLabel}</span>
              <button onClick={() => setCtx(null)} className="text-amber-500 hover:text-amber-700"><X className="h-3 w-3" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea rows={1} value={question} onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                const isSendCombo = sendOnCtrlEnter ? (e.ctrlKey || e.metaKey) : !e.shiftKey
                if (e.key === 'Enter' && isSendCombo) { e.preventDefault(); submit() }
              }}
              placeholder={"问：单词怎么拼？这句话什么语法？" + (sendOnCtrlEnter ? ' (Ctrl+Enter 发送)' : '')}
              className="flex-1 resize-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[13px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
            <button onClick={submit} disabled={!question.trim() || isLoading}
              className={`px-3 rounded-xl flex items-center justify-center ${!question.trim() || isLoading ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
