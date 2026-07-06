import type { Scenario } from "../../types"
import type { SpeechAccent } from "./speech"
import { RefreshCw } from "lucide-react"

interface ChatToolbarProps {
  activeScenario: Scenario
  accent: SpeechAccent
  speed: number
  onAccentChange: (accent: SpeechAccent) => void
  onSpeedChange: (speed: number) => void
  onResetChat: () => void
}

export function ChatToolbar({
  activeScenario,
  accent,
  speed,
  onAccentChange,
  onSpeedChange,
  onResetChat,
}: ChatToolbarProps) {
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
          <button
            onClick={() => onAccentChange("us")}
            className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
              accent === "us"
                ? "bg-white dark:bg-zinc-900 shadow-xs text-indigo-600 dark:text-indigo-400"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            🇺🇸 美音 (US)
          </button>
          <button
            onClick={() => onAccentChange("uk")}
            className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
              accent === "uk"
                ? "bg-white dark:bg-zinc-900 shadow-xs text-indigo-600 dark:text-indigo-400"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            🇬🇧 英音 (UK)
          </button>
        </div>

        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">语速 (Speed)</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={speed}
            onChange={(event) => onSpeedChange(parseFloat(event.target.value))}
            className="w-16 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 w-5">
            {speed.toFixed(1)}x
          </span>
        </div>

        <button
          onClick={onResetChat}
          className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-500 hover:text-indigo-600 cursor-pointer transition flex items-center gap-1"
          title="清空记录重新开始对话"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="text-[11px] font-semibold pr-0.5">重开对话</span>
        </button>
      </div>
    </div>
  )
}
