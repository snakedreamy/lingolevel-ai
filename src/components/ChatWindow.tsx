// src/components/ChatWindow.tsx
// Merged: ChatWindow + ChatToolbar + ChatMessageList + ChatInputBar (from features/chat/)
import React, { useEffect, useRef, useState } from 'react'
import { Languages, Volume2, Copy, Clock, Send, Mic, MicOff, RefreshCw, HelpCircle } from 'lucide-react'
import type { Message, Scenario } from '../types'
import { createSpeechRecognition, speakText, type SpeechAccent, type SpeechRecognition } from '../lib/speech'

// ─── ChatToolbar ────────────────────────────────────────────────────────────

function ChatToolbar({
  activeScenario, accent, speed, onAccentChange, onSpeedChange, onResetChat,
}: {
  activeScenario: Scenario
  accent: SpeechAccent
  speed: number
  onAccentChange: (accent: SpeechAccent) => void
  onSpeedChange: (speed: number) => void
  onResetChat: () => void
}) {
  return (
    <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between z-10">
      <div className="min-w-0 flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider scale-90 origin-left">
              {activeScenario.name}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
            Active Context: {activeScenario.description}
          </p>
        </div>
      </div>

      <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:gap-4 sm:overflow-visible sm:pb-0">
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10.5px] font-semibold border border-zinc-200 dark:border-zinc-800">
          {(['us', 'uk'] as SpeechAccent[]).map((a) => (
            <button key={a} onClick={() => onAccentChange(a)}
              className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${accent === a ? 'bg-white dark:bg-zinc-900 shadow-xs text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {a === 'us' ? '🇺🇸 美音 (US)' : '🇬🇧 英音 (UK)'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">语速</span>
          <input type="range" min="0.5" max="1.5" step="0.1" value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 w-5">{speed.toFixed(1)}x</span>
        </div>

        <button onClick={onResetChat}
          className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-500 hover:text-indigo-600 cursor-pointer transition flex items-center gap-1"
          title="清空记录重新开始对话">
          <RefreshCw className="h-4 w-4" />
          <span className="text-[11px] font-semibold pr-0.5">重开对话</span>
        </button>
      </div>
    </div>
  )
}

// ─── ChatMessageList ─────────────────────────────────────────────────────────

function ChatMessageList({
  messages, isLoading, isSpeakingId, onSpeakMessage, onCopyMessage, messagesEndRef, onWordClick,
}: {
  messages: Message[]
  isLoading: boolean
  isSpeakingId: string | null
  onSpeakMessage: (text: string, id: string) => void
  onCopyMessage: (text: string, e: React.MouseEvent) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onWordClick: (word: string) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center py-16 text-zinc-400 max-w-sm mx-auto">
          <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-full mb-4">
            <Languages className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-bounce" />
          </div>
          <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">开始您的沉浸式英语之旅</p>
          <p className="text-xs text-zinc-500 mt-2">在底部文本框打字，或开启麦克风朗读；发送后可用反馈面板中的智能建议继续接话。</p>
        </div>
      )}

      {messages.map((message) => {
        const isUser = message.role === 'user'
        if (message.role === 'system') {
          return (
            <div key={message.id} className="flex justify-center my-3 animate-fade-in">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {message.content}
              </span>
            </div>
          )
        }

        return (
          <div key={message.id} className={`flex w-full group ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] sm:max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div data-msg-bubble className={`rounded-2xl px-4 py-3 shadow-xs relative transition-all duration-200 ${isUser ? 'bg-indigo-600 text-white rounded-tr-none hover:bg-indigo-700' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none hover:shadow-xs'}`}>
                <div className="flex justify-between items-start gap-3 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${isUser ? 'bg-indigo-500/65 text-white' : message.isFallback ? 'bg-amber-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                      {isUser ? 'You' : message.isFallback ? 'AI (Backup)' : 'AI Coach'}
                    </span>
                    {!isUser && message.isFallback && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-50/90 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-900 animate-pulse">
                        ⚠️ 备用回复
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onSpeakMessage(message.content, message.id)}
                      className={`p-1 rounded transition-colors ${isUser ? 'hover:bg-indigo-500 text-indigo-200 hover:text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-600'} ${isSpeakingId === message.id ? 'animate-pulse text-rose-500! dark:text-rose-400!' : ''}`}
                      title="朗读">
                      <Volume2 className={`h-3.5 w-3.5 ${isSpeakingId === message.id ? 'scale-110' : ''}`} />
                    </button>
                    <button onClick={(e) => onCopyMessage(message.content, e)}
                      className={`p-1 rounded transition-colors ${isUser ? 'hover:bg-indigo-500 text-indigo-200 hover:text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-600'}`}
                      title="复制">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed break-words font-sans selection:bg-indigo-200">
                  {isUser
                    ? message.content
                    : message.streaming
                      ? message.content
                      : renderClickableContent(message.content, onWordClick)}
                  {message.streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current animate-pulse align-middle" />}
                </p>
                {isSpeakingId === message.id && (
                  <div className="flex items-center gap-0.5 mt-2 h-3 justify-center">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-0.5 h-full bg-current rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[9px] text-zinc-400 font-mono">
                <Clock className="h-2.5 w-2.5 text-zinc-300" />
                <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        )
      })}

      {isLoading && (
        <div className="flex w-full justify-start animate-fade-in">
          <div className="max-w-[92%] sm:max-w-[80%] flex flex-col items-start">
            <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-extrabold uppercase px-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded p-0.5">AI Coach</span>
                <p className="text-[11px] text-zinc-400 italic">正在生成回复...</p>
              </div>
              <div className="flex items-center gap-1 mt-3">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
          className="hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 hover:text-indigo-700 dark:hover:text-indigo-300 rounded px-0.5 cursor-pointer">
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
    <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 backdrop-blur z-10 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <button type="button" onClick={onToggleRecord}
          className={`p-3 rounded-xl border flex-shrink-0 flex items-center justify-center transition cursor-pointer relative ${isRecording ? 'bg-rose-50 border-rose-400 text-rose-600 animate-pulse' : 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-400 hover:text-indigo-600'}`}
          title={isRecording ? '正在倾听... 点击停止' : '开启口语录音'}
          aria-label={isRecording ? '停止语音录入' : '开始语音录入'}>
          {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          {isRecording && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-600 text-[8px] font-extrabold text-white rounded-full flex items-center justify-center border-2 border-white">!</span>
          )}
        </button>

        <div className="relative flex-1">
          <textarea ref={inputRef} rows={2} value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isRecording ? '正在听写您的英文发音...' : (sendOnCtrlEnter ? '输入英文以练习聊天... (Ctrl+Enter 发送)' : '输入英文以练习聊天... (Shift+Enter 换行)')}
            className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 text-[13px] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl py-2 pl-3 pr-10 resize-none font-sans"
            disabled={isLoading} />
          {inputText.trim() && (
            <button type="button" onClick={onClearInput}
              className="absolute right-3.5 top-2.5 p-1 text-zinc-300 hover:text-zinc-500" title="清空输入框">
              &times;
            </button>
          )}
        </div>

        <button type="submit" disabled={!inputText.trim() || isLoading} aria-label="发送消息"
          className={`p-3 px-4 rounded-xl flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${!inputText.trim() || isLoading ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow'}`}>
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center mt-2.5 text-[10px] text-zinc-400">
        <span>点击反馈面板里的接话建议，可直接填入输入框。</span>
        <span>按 <strong className="font-semibold text-zinc-600">{sendOnCtrlEnter ? 'Ctrl+Enter' : 'Enter'}</strong> 发送</span>
      </div>
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
  /** When true, only Ctrl/Cmd+Enter sends; bare Enter inserts a newline. */
  sendOnCtrlEnter?: boolean
}

export default function ChatWindow({
  messages, onSendMessage, isLoading, activeScenario, onResetChat, inputRef, inputText, setInputText,
  onWordClick, onSelectSentence, sendOnCtrlEnter = false,
}: ChatWindowProps) {
  const [accent, setAccent] = useState<SpeechAccent>('us')
  const [speed, setSpeed] = useState(1.0)
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null)
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

  const handleSpeakText = (text: string, messageId: string) => {
    try {
      if (isSpeakingId === messageId) { window.speechSynthesis.cancel(); setIsSpeakingId(null); return }
      speakText({ text, accent, speed, onStart: () => setIsSpeakingId(messageId), onEnd: () => setIsSpeakingId(null) })
    } catch (err) {
      if (err instanceof Error && err.message === 'SPEECH_SYNTHESIS_UNAVAILABLE') showStatus('当前浏览器不支持语音朗读功能。')
      setIsSpeakingId(null)
    }
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
    <div className="h-full flex flex-col bg-stone-50/40 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden relative">
      <ChatToolbar activeScenario={activeScenario} accent={accent} speed={speed}
        onAccentChange={setAccent} onSpeedChange={setSpeed} onResetChat={onResetChat} />

      <div className="min-h-0 flex-1 flex flex-col" onMouseUp={handleSelection}>
        <ChatMessageList messages={messages} isLoading={isLoading} isSpeakingId={isSpeakingId}
          onSpeakMessage={handleSpeakText} onCopyMessage={handleCopyText} messagesEndRef={messagesEndRef}
          onWordClick={onWordClick} />
      </div>

      {selectionBox && (
        <button
          onClick={() => { onSelectSentence(selectionBox.text); setSelectionBox(null); window.getSelection()?.removeAllRanges() }}
          className="fixed z-50 -translate-x-1/2 -translate-y-full bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg hover:bg-indigo-700 cursor-pointer whitespace-nowrap"
          style={{ left: selectionBox.x, top: selectionBox.y - 8 }}>
          深讲这句话
        </button>
      )}

      {(recognitionError || statusMessage) && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-amber-50 dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 px-4 py-2 rounded-xl shadow-md flex items-center gap-2 z-20 text-xs animate-slide-up text-amber-700 dark:text-amber-400 max-w-[90%]">
          <HelpCircle className="h-4 w-4 flex-shrink-0 animate-bounce" />
          <span>{recognitionError ?? statusMessage}</span>
          {recognitionError && (
            <button onClick={() => setRecognitionError(null)} className="text-[10px] underline font-bold pl-2 cursor-pointer">我已知晓</button>
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
