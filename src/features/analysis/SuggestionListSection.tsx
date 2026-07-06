import { ArrowRight } from "lucide-react"

interface SuggestionListSectionProps {
  suggestions: string[]
  onSelectSuggestion: (text: string) => void
}

const SUGGESTION_STEPS = [
  { badge: "先接住" },
  { badge: "再展开" },
  { badge: "继续追问" },
] as const

function parseSuggestion(value: string) {
  const regex = /^(.*?)\s*\[(.*?)\]$/
  const match = value.match(regex)
  if (match) {
    return { english: match[1].trim(), chinese: match[2].trim() }
  }
  return { english: value, chinese: "" }
}

function suggestionStep(index: number) {
  return SUGGESTION_STEPS[index] ?? {
    badge: `补充${index + 1}`,
  }
}

export function SuggestionListSection({ suggestions, onSelectSuggestion }: SuggestionListSectionProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-3">
      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono block w-max">
        接话建议 Speech Suggestions
      </span>
      <div className="space-y-2">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion, index) => {
            const parsed = parseSuggestion(suggestion)
            const step = suggestionStep(index)
            return (
              <button
                key={index}
                onClick={() => onSelectSuggestion(parsed.english)}
                className="w-full text-left p-3 bg-indigo-50/10 dark:bg-indigo-950/10 border border-dashed border-indigo-200 dark:border-indigo-900/40 rounded-xl hover:border-indigo-500/80 hover:bg-indigo-50/35 dark:hover:bg-indigo-950/20 cursor-pointer transition text-xs scale-hover flex gap-2 items-start font-sans"
              >
                <ArrowRight className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                      {step.badge}
                    </span>
                  </div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{parsed.english}</p>
                  {parsed.chinese && (
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{parsed.chinese}</p>
                  )}
                </div>
              </button>
            )
          })
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-400">
            本轮暂未生成接话建议。您可以直接回答 AI 最后一个问题，或先用自己的话继续接住对话。
          </div>
        )}
      </div>
    </div>
  )
}
