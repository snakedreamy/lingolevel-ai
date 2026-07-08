import type { AssistantReplyInsight } from "../../types"

interface AnalysisTranslationCardProps {
  translation: string
  assistantReplyInsight?: AssistantReplyInsight | null
  isFallback?: boolean
}

const DEFAULT_ASSISTANT_REPLY_INSIGHT: AssistantReplyInsight = {
  structure: "它先顺着当前话题往下接，并给了你一条最容易继续说下去的路。",
  grammar: "优先模仿这一轮里最容易直接复用的问句或回答，不必每次都硬找复杂语法点。",
  whyThisReply: "先看懂它下一步想聊什么，再直接借用里面的句型接话。",
}

function InsightLine({ label, value }: { label: string; value: string }) {
  const content = value.trim() || "本轮暂无可直接复用的提示。"

  return (
    <div className="space-y-1 rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/30">
      <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">{content}</p>
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
            这句怎么学
          </span>
          {isFallback && (
            <span className="text-[10px] text-amber-700 dark:text-amber-300">参考说明</span>
          )}
        </div>
        <div className="space-y-2.5">
          <InsightLine label="它这句在干什么" value={insight.structure} />
          <InsightLine label="你可以直接套用哪种说法" value={insight.grammar} />
          <InsightLine label="你下一句最容易往哪里接" value={insight.whyThisReply} />
        </div>
      </div>
    </div>
  )
}
