import type { FormEvent, KeyboardEvent, RefObject } from "react"
import { Send, Mic, MicOff } from "lucide-react"

interface ChatInputBarProps {
  isLoading: boolean
  isRecording: boolean
  inputText: string
  inputRef: RefObject<HTMLTextAreaElement | null>
  onInputChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onSubmit: (event: FormEvent) => void
  onToggleRecord: () => void
  onClearInput: () => void
}

export function ChatInputBar({
  isLoading,
  isRecording,
  inputText,
  inputRef,
  onInputChange,
  onKeyDown,
  onSubmit,
  onToggleRecord,
  onClearInput,
}: ChatInputBarProps) {
  return (
    <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 backdrop-blur z-10 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <button
          type="button"
          onClick={onToggleRecord}
          className={`p-3 rounded-xl border flex-shrink-0 flex items-center justify-center transition cursor-pointer relative ${
            isRecording
              ? "bg-rose-50 border-rose-400 text-rose-600 animate-pulse"
              : "bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-400 hover:text-indigo-600"
          }`}
          title={isRecording ? "正在倾听您的发音... 再次点击停止录音" : "开启口语录音"}
          aria-label={isRecording ? "停止语音录入" : "开始语音录入"}
        >
          {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}

          {isRecording && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-600 text-[8px] font-extrabold text-white rounded-full flex items-center justify-center border-2 border-white">
              !
            </span>
          )}
        </button>

        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isRecording ? "正在听写您的英文发音..." : "输入英文以练习聊天... (支持 Shift+Enter 换行)"}
            className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 text-[13px] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl py-2 pl-3 pr-10 resize-none font-sans"
            disabled={isLoading}
          />
          {inputText.trim() && (
            <button
              type="button"
              onClick={onClearInput}
              className="absolute right-3.5 top-2.5 p-1 text-zinc-300 hover:text-zinc-500"
              title="清空输入框"
            >
              &times;
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          aria-label="发送消息"
          className={`p-3 px-4 rounded-xl flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
            !inputText.trim() || isLoading
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
              : "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow"
          }`}
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>

      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center mt-2.5 text-[10px] text-zinc-400">
        <span>建议：您可以直接点击反馈面板里的智能接话建议，快速生成下一句英文草稿。</span>
        <span>按 <strong className="font-semibold text-zinc-600">Enter</strong> 发送</span>
      </div>
    </div>
  )
}
