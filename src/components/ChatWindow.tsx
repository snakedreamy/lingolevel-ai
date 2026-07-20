// src/components/ChatWindow.tsx
// 版式：对话是一张带行号的练习纸。左侧 gilt 行号标明轮次，AI 回复用斜体衬线，
// 用户的话加朱色侧线——不是聊天软件，是一页被批注过的会话作业。
import React, { useEffect, useRef, useState } from 'react'
import { Languages, Copy, Send, Mic, MicOff, RefreshCw, HelpCircle } from './Icon'
import type { Message, Scenario } from '../types'
import { createSpeechRecognition, type SpeechRecognition } from '../lib/speech'
import { useSpeech } from './ui'
import SpeechButton from './SpeechButton'

// ─── ChatToolbar ────────────────────────────────────────────────────────────

function ChatToolbar({
  activeScenario, onResetChat,
}: {
  activeScenario: Scenario
  onResetChat: () => void
}) {
  return (
    <div className="z-10 flex flex-col gap-2 border-b ui-rule px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
      <div className="flex min-w-0 items-baseline gap-2.5">
        <span className="margin-code shrink-0">场景</span>
        <p className="min-w-0 truncate text-sm font-semibold">
          {activeScenario.name}
          <span className="ml-2 hidden text-xs font-normal ui-text-faint sm:inline">{activeScenario.englishName}</span>
        </p>
        <p className="hidden min-w-0 truncate text-xs ui-text-faint md:block">— {activeScenario.description}</p>
      </div>

      <div className="flex w-full justify-end sm:w-auto">
        <button onClick={onResetChat}
          className="ui-btn !h-8 !text-[11px] hover:!border-scarlet hover:!text-scarlet dark:hover:!border-scarlet-dark dark:hover:!text-scarlet-dark"
          title="清空记录重新开始对话">
          <RefreshCw className="h-3.5 w-3.5" />
          重开对话
        </button>
      </div>
    </div>
  )
}

// ─── ChatMessageList ─────────────────────────────────────────────────────────

function ChatMessageList({
  messages, regeneratableAssistantId, onRegenerateMessage,
  onCopyMessage, messagesEndRef, onWordClick,
}: {
  messages: Message[]
  regeneratableAssistantId: string | null
  onRegenerateMessage: () => void
  onCopyMessage: (text: string, e: React.MouseEvent) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onWordClick: (word: string) => void
}) {
  const speech = useSpeech()
  let turn = 0
  return (
    <div className="ui-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-6">
      {messages.length === 0 && (
        <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center py-16 text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-full border ui-rule text-forest dark:text-forest-dark">
            <Languages className="h-7 w-7" />
          </div>
          <p className="target-lang text-lg ui-text-muted">Say something in English to begin.</p>
          <p className="mt-2 text-xs ui-text-faint">发送一句英文开始练习</p>
        </div>
      )}

      {messages.map((message) => {
        const isUser = message.role === 'user'
        const speechId = `chat:${message.id}`
        if (message.role === 'system') {
          return (
            <div key={message.id} className="my-4 flex items-center gap-3 animate-fade-in" role="note">
              <span aria-hidden="true" className="h-px flex-1 bg-ink/10 dark:bg-ink-dark/15" />
              <span className="text-[11px] tracking-wide ui-text-faint">{message.content}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-ink/10 dark:bg-ink-dark/15" />
            </div>
          )
        }

        turn += 1
        return (
          <div key={message.id} className={`group relative flex gap-3 rounded-md py-2.5 pr-2 sm:gap-5 ${isUser ? 'flex-row-reverse' : ''}`}>
            <span aria-hidden="true" className="margin-code w-7 shrink-0 pt-1.5 text-right select-none">
              {String(turn).padStart(2, '0')}
            </span>

            <div className={`min-w-0 max-w-[86%] flex-1 sm:max-w-[78%] ${isUser ? 'border-r-2 border-scarlet pr-3 text-right dark:border-scarlet-dark sm:pr-4' : 'border-l ui-rule pl-3 sm:pl-4'}`}>
              <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                <span className={`margin-code ${message.isFallback ? '!text-scarlet dark:!text-scarlet-dark' : ''}`}>
                  {isUser ? '你' : message.isFallback ? '教师 · 备用回复' : '教师'}
                </span>
                <div className={`flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${isUser ? 'flex-row-reverse' : ''}`}>
                  {!isUser && message.id === regeneratableAssistantId && (
                    <button onClick={onRegenerateMessage}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold ui-text-faint transition-colors hover:bg-ink/5 hover:text-forest dark:hover:bg-ink-dark/10 dark:hover:text-forest-dark"
                      title={message.isFallback ? '重试回复' : '换一个回答'}
                      aria-label={message.isFallback ? '重试回复' : '换一个回答'}>
                      <RefreshCw className="h-3 w-3" />
                      {message.isFallback ? '重试' : '换一个'}
                    </button>
                  )}
                  <SpeechButton active={speech.activeId === speechId}
                    onClick={() => speech.toggle(speechId, message.content, isUser ? '你的消息' : 'AI 回复')}
                    label={isUser ? '你的消息' : 'AI 回复'} />
                  <button onClick={(e) => onCopyMessage(message.content, e)}
                    className="rounded p-1 ui-text-faint transition-colors hover:bg-ink/5 hover:text-forest dark:hover:bg-ink-dark/10 dark:hover:text-forest-dark"
                    title="复制">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div data-msg-bubble className={`mt-1 break-words leading-relaxed ${isUser
                ? 'font-body text-[15px]'
                : 'target-lang text-[16.5px]'}`}>
                {isUser
                  ? message.content
                  : message.streaming
                    ? message.content
                    : renderClickableContent(message.content, onWordClick)}
                {message.streaming && <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-scarlet align-middle not-italic dark:bg-scarlet-dark" />}
              </div>
            </div>
          </div>
        )
      })}

      <div ref={messagesEndRef} />
    </div>
  )
}

function renderClickableContent(text: string, onWord: (w: string) => void) {
  const parts = text.split(/([A-Za-z]+(?:'[A-Za-z]+)?)/g)
  return parts.map((part, i) => {
    if (/^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(part)) {
      return (
        <button key={i} onClick={() => onWord(part)}
          className="cursor-pointer rounded-sm px-px not-italic underline decoration-forest/0 decoration-dotted underline-offset-4 transition hover:bg-forest/10 hover:decoration-forest dark:hover:bg-forest-dark/15 dark:hover:decoration-forest-dark">
          {part}
        </button>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// ─── ChatInputBar ────────────────────────────────────────────────────────────

function ChatInputBar({
  isLoading, isRecording, inputText, inputRef, onInputChange, onKeyDown, onSubmit, onToggleRecord, onClearInput, sendOnCtrlEnter = false,
}: {
  isLoading: boolean
  isRecording: boolean
  inputText: string
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  onInputChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent) => void
  onToggleRecord: () => void
  onClearInput: () => void
  sendOnCtrlEnter?: boolean
}) {
  return (
    <div className="z-10 border-t-2 border-ink/70 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 dark:border-ink-dark/60 sm:px-5 sm:pt-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <button type="button" onClick={onToggleRecord}
          className={`relative flex h-[52px] w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border transition ${isRecording ? 'border-scarlet bg-scarlet/10 text-scarlet dark:border-scarlet-dark dark:bg-scarlet-dark/15 dark:text-scarlet-dark' : 'ui-btn !h-[52px] !w-11 !px-0 hover:!border-forest hover:!text-forest dark:hover:!border-forest-dark dark:hover:!text-forest-dark'}`}
          title={isRecording ? '正在倾听... 点击停止' : '开启口语录音'}
          aria-label={isRecording ? '停止语音录入' : '开始语音录入'}>
          {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          {isRecording && (
            <span className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-scarlet text-[8px] font-extrabold text-paper dark:bg-scarlet-dark dark:text-paper-dark">!</span>
          )}
        </button>

        <div className="relative flex-1">
          <textarea ref={inputRef} rows={2} value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isRecording ? '正在听写您的英文发音...' : (sendOnCtrlEnter ? '在此作答…… (Ctrl+Enter 发送)' : '在此作答…… (Shift+Enter 换行)')}
            className="target-lang ui-input w-full resize-none px-3 py-2.5 text-[15px]"
            disabled={isLoading} />
          {inputText.trim() && (
            <button type="button" onClick={onClearInput}
              className="absolute right-3 top-2.5 p-1 ui-text-faint hover:text-ink dark:hover:text-ink-dark" title="清空输入框">
              &times;
            </button>
          )}
        </div>

        <button type="submit" disabled={!inputText.trim() || isLoading} aria-label="发送消息"
          className={`flex h-[52px] flex-shrink-0 cursor-pointer items-center justify-center rounded-md px-4 transition-all ${!inputText.trim() || isLoading ? 'cursor-not-allowed bg-ink/10 text-ink/35 dark:bg-ink-dark/15 dark:text-ink-dark/35' : 'bg-forest text-paper hover:bg-forest/90 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90'}`}>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

// ─── ChatWindow (main export) ────────────────────────────────────────────────

interface ChatWindowProps {
  messages: Message[]
  onSendMessage: (text: string) => void
  isLoading: boolean
  activeScenario: Scenario
  onResetChat: () => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  inputText: string
  setInputText: React.Dispatch<React.SetStateAction<string>>
  onWordClick: (word: string) => void
  onSelectSentence: (sentence: string) => void
  regeneratableAssistantId: string | null
  onRegenerateMessage: () => void
  /** When true, only Ctrl/Cmd+Enter sends; bare Enter inserts a newline. */
  sendOnCtrlEnter?: boolean
}

export default function ChatWindow({
  messages, onSendMessage, isLoading, activeScenario, onResetChat, inputRef, inputText, setInputText,
  onWordClick, onSelectSentence, regeneratableAssistantId, onRegenerateMessage, sendOnCtrlEnter = false,
}: ChatWindowProps) {
  const speech = useSpeech()
  const [isRecording, setIsRecording] = useState(false)
  const [recognitionError, setRecognitionError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [selectionBox, setSelectionBox] = useState<{ text: string; x: number; y: number } | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSelection = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) { setSelectionBox(null); return }
    const text = sel.toString().trim()
    if (text.length < 5 || text.length > 300) { setSelectionBox(null); return }
    const range = sel.getRangeAt(0)
    const bubble = (range.commonAncestorContainer as HTMLElement).closest?.('[data-msg-bubble]')
    if (!bubble) { setSelectionBox(null); return }
    const rect = range.getBoundingClientRect()
    setSelectionBox({ text, x: rect.left + rect.width / 2, y: rect.top })
  }

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isLoading])

  useEffect(() => {
    const onScroll = () => setSelectionBox(null)
    const onSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) setSelectionBox(null)
    }
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [])

  useEffect(() => {
    recognitionRef.current = createSpeechRecognition(setInputText, setIsRecording, setRecognitionError)
  }, [setInputText])

  useEffect(() => {
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  const showStatus = (msg: string) => setStatusMessage(msg)

  const handleToggleRecord = () => {
    if (!recognitionRef.current) { showStatus('当前浏览器不支持语音录入，推荐使用 Chrome 或 Edge。'); return }
    if (isRecording) { recognitionRef.current.stop(); return }
    try { recognitionRef.current.start() } catch { showStatus('语音录入暂时无法启动，请稍后再试。') }
  }

  const handleCopyText = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try { await navigator.clipboard.writeText(text); showStatus('文本已复制到剪贴板。') }
    catch { showStatus('复制失败，请手动选择文本后复制。') }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading) return
    onSendMessage(inputText)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // sendOnCtrlEnter 模式：仅 Ctrl/Cmd+Enter 发送，裸 Enter 换行
    // 默认模式：裸 Enter 发送，Shift+Enter 换行
    const isSendCombo = sendOnCtrlEnter ? (e.ctrlKey || e.metaKey) : !e.shiftKey
    if (e.key === 'Enter' && isSendCombo) {
      e.preventDefault()
      if (!inputText.trim() || isLoading) return
      onSendMessage(inputText)
    }
  }

  return (
    <div className="ui-surface relative flex h-full flex-col overflow-hidden">
      <ChatToolbar activeScenario={activeScenario} onResetChat={onResetChat} />

      <div className="flex min-h-0 flex-1 flex-col" onMouseUp={handleSelection}>
        <ChatMessageList messages={messages}
          regeneratableAssistantId={regeneratableAssistantId} onRegenerateMessage={onRegenerateMessage}
          onCopyMessage={handleCopyText} messagesEndRef={messagesEndRef}
          onWordClick={onWordClick} />
      </div>

      {selectionBox && (
        <div className="fixed z-50 flex -translate-x-1/2 -translate-y-full items-center rounded-md bg-ink p-1 text-paper shadow-lg dark:bg-ink-dark dark:text-paper-dark"
          style={{ left: selectionBox.x, top: selectionBox.y - 8 }}>
          <button type="button"
            onClick={() => { onSelectSentence(selectionBox.text); setSelectionBox(null); window.getSelection()?.removeAllRanges() }}
            className="whitespace-nowrap rounded px-2 py-1 text-[11px] font-bold hover:bg-paper/15 dark:hover:bg-paper-dark/15">
            深讲
          </button>
          <span className="mx-0.5 h-4 w-px bg-paper/20 dark:bg-paper-dark/20" />
          <SpeechButton active={speech.activeId === 'chat:selection'}
            onClick={() => {
              speech.toggle('chat:selection', selectionBox.text, '选中内容')
              setSelectionBox(null)
              window.getSelection()?.removeAllRanges()
            }}
            label="选中内容" tone="inverse" showText />
        </div>
      )}

      {(recognitionError || statusMessage) && (
        <div className="absolute bottom-24 left-1/2 z-20 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-md border border-scarlet/30 bg-scarlet/5 px-4 py-2 text-xs text-scarlet shadow-md animate-slide-up dark:border-scarlet-dark/40 dark:bg-scarlet-dark/10 dark:text-scarlet-dark">
          <HelpCircle className="h-4 w-4 flex-shrink-0" />
          <span>{recognitionError ?? statusMessage}</span>
          {recognitionError && (
            <button onClick={() => setRecognitionError(null)} className="cursor-pointer pl-2 text-[10px] font-bold underline">我已知晓</button>
          )}
        </div>
      )}

      <ChatInputBar isLoading={isLoading} isRecording={isRecording} inputText={inputText}
        inputRef={inputRef} onInputChange={setInputText} onKeyDown={handleKeyDown}
        onSubmit={handleSubmit} onToggleRecord={handleToggleRecord} onClearInput={() => setInputText('')}
        sendOnCtrlEnter={sendOnCtrlEnter} />
    </div>
  )
}
