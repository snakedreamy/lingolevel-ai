import type { AssistantReplyInsight } from "../../types"

interface AnalysisTranslationCardProps {
  translation: string
  assistantReplyInsight?: AssistantReplyInsight | null
  isFallback?: boolean
}

const DEFAULT_ASSISTANT_REPLY_INSIGHT: AssistantReplyInsight = {
  structure: "这句回复通常会先回应上文，再补充信息或继续推进对话。",
  grammar: "可重点观察其中的时态、问句结构，以及句子之间如何自然衔接。",
  whyThisReply: "它既承接了当前语境，也主动给出了下一个可继续交流的话题，所以读起来更自然。",
}

function InsightLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">{value}</p>
    </div>
  )
}

export function AnalysisTranslationCard({ translation, assistantReplyInsight, isFallback = false }: AnalysisTranslationCardProps) {
  const insight = assistantReplyInsight ?? DEFAULT_ASSISTANT_REPLY_INSIGHT

  return (
    <div className="bg-stone-50/70 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono">
          对照翻译 Translation
        </span>
        <span className="text-[10px] text-zinc-400">自动捕捉</span>
      </div>
      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal whitespace-pre-line">
        {translation || "暂无翻译数据。"}
      </p>

      <div className="border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono">
            AI 回复说明 Reply Structure
          </span>
          {isFallback && (
            <span className="text-[10px] text-amber-700 dark:text-amber-300">参考说明</span>
          )}
        </div>
        <div className="space-y-2.5">
          <InsightLine label="句子结构怎么组成" value={insight.structure} />
          <InsightLine label="语法/从句关系" value={insight.grammar} />
          <InsightLine label="为什么在这个语境下这样回答" value={insight.whyThisReply} />
        </div>
      </div>
    </div>
  )
}
