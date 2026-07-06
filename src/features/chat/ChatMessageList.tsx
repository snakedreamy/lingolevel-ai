import { Languages, Volume2, Copy, Clock } from "lucide-react"
import type React from "react"
import type { Message } from "../../types"

interface ChatMessageListProps {
  messages: Message[]
  isLoading: boolean
  isSpeakingId: string | null
  onSpeakMessage: (text: string, messageId: string) => void
  onCopyMessage: (text: string, event: React.MouseEvent) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

export function ChatMessageList({
  messages,
  isLoading,
  isSpeakingId,
  onSpeakMessage,
  onCopyMessage,
  messagesEndRef,
}: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center py-16 text-zinc-400 max-w-sm mx-auto">
          <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-full mb-4">
            <Languages className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-bounce" />
          </div>
          <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">开始您的沉浸式英语之旅</p>
          <p className="text-xs text-zinc-500 mt-2">
            您可用在底部文本框打字，或者开启麦克风朗读，还可以点击右侧的智能建议快捷回复。
          </p>
        </div>
      )}

      {messages.map((message) => {
        const isUser = message.role === "user"
        if (message.role === "system") {
          return (
            <div key={message.id} className="flex justify-center my-3 animate-fade-in">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shadow-3xs">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {message.content}
              </span>
            </div>
          )
        }

        return (
          <div
            key={message.id}
            className={`flex w-full group ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[92%] sm:max-w-[80%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              <div
                className={`rounded-2xl px-4 py-3 shadow-xs relative transition-all duration-200 ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-tr-none hover:bg-indigo-700"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none hover:shadow-xs"
                }`}
              >
                <div className="flex justify-between items-start gap-3 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                      isUser
                        ? "bg-indigo-500/65 text-white"
                        : message.isFallback
                        ? "bg-amber-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                    }`}>
                      {isUser ? "You" : message.isFallback ? "AI Coach (Backup)" : "AI Coach"}
                    </span>
                    {!isUser && message.isFallback && (
                      <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 bg-amber-50/90 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-900 animate-pulse">
                        ⚠️ 备用回复模式
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSpeakMessage(message.content, message.id)}
                      className={`p-1 rounded transition-colors ${
                        isUser
                          ? "hover:bg-indigo-500 text-indigo-200 hover:text-white"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-600"
                      } ${isSpeakingId === message.id ? "animate-pulse text-rose-500! dark:text-rose-400!" : ""}`}
                      title="朗读本句话"
                    >
                      <Volume2 className={`h-3.5 w-3.5 ${isSpeakingId === message.id ? "scale-110" : ""}`} />
                    </button>
                    <button
                      onClick={(event) => onCopyMessage(message.content, event)}
                      className={`p-1 rounded transition-colors ${
                        isUser
                          ? "hover:bg-indigo-500 text-indigo-200 hover:text-white"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-600"
                      }`}
                      title="复制这行内容"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <p className="text-[13px] leading-relaxed break-words font-sans selection:bg-indigo-200">
                  {message.content}
                </p>

                {isSpeakingId === message.id && (
                  <div className="flex items-center gap-0.5 mt-2 h-3 justify-center">
                    <div className="w-0.5 h-full bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-0.5 h-full bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-0.5 h-full bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 mt-1 text-[9px] text-zinc-400 font-mono">
                <Clock className="h-2.5 w-2.5 text-zinc-300" />
                <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
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
                <p className="text-[11px] text-zinc-400 italic">Thinking and checking grammar...</p>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
