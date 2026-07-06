import { ArrowRight } from "lucide-react"

interface SuggestionListSectionProps {
  suggestions: string[]
  onSelectSuggestion: (text: string) => void
}

function parseSuggestion(value: string) {
  const regex = /^(.*?)\s*\[(.*?)\]$/
  const match = value.match(regex)
  if (match) {
    return { english: match[1].trim(), chinese: match[2].trim() }
  }
  return { english: value, chinese: "" }
}

export function SuggestionListSection({ suggestions, onSelectSuggestion }: SuggestionListSectionProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-3">
      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono block w-max">
        智能接话建议 Speech Suggestions
      </span>
      <p className="text-[11.5px] text-zinc-500 leading-normal">
        不知道怎么接话？点击下方契合当前难度的地道回答，可直接填充至左侧对话框：
      </p>

      <div className="space-y-2">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion, index) => {
            const parsed = parseSuggestion(suggestion)
            return (
              <button
                key={index}
                onClick={() => onSelectSuggestion(parsed.english)}
                className="w-full text-left p-2.5 bg-indigo-50/10 dark:bg-indigo-950/10 border border-dashed border-indigo-200 dark:border-indigo-900/40 rounded-xl hover:border-indigo-500/80 hover:bg-indigo-50/35 dark:hover:bg-indigo-950/20 cursor-pointer transition text-xs scale-hover flex gap-1.5 items-start font-sans"
              >
                <ArrowRight className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{parsed.english}</p>
                  {parsed.chinese && (
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{parsed.chinese}</p>
                  )}
                </div>
              </button>
            )
          })
        ) : (
          <p className="text-xs text-zinc-400 italic">暂无建议</p>
        )}
      </div>
    </div>
  )
}
