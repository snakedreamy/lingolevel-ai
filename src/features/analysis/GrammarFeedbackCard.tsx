import type { GrammarCorrection } from "../../types"
import { AlertTriangle, ShieldCheck, Volume2 } from "lucide-react"

interface GrammarFeedbackCardProps {
  corrections: GrammarCorrection[]
  onSpeakText: (text: string) => void
  isFallback?: boolean
}

function deriveLearningFocus(correction: GrammarCorrection) {
  const lowerCombined = `${correction.explanation} ${correction.original} ${correction.corrected}`.toLowerCase()

  if (
    lowerCombined.includes("时态") ||
    lowerCombined.includes("过去时") ||
    lowerCombined.includes("yesterday") ||
    lowerCombined.includes("last ") ||
    lowerCombined.includes("ago")
  ) {
    return {
      label: "本轮重点：一般过去时",
      rule: "看到 yesterday / last ... / ago 这类时间线索时，优先检查动词是否该改成过去式。",
    }
  }

  if (lowerCombined.includes("介词") || lowerCombined.includes("preposition")) {
    return {
      label: "本轮重点：固定搭配",
      rule: "地点、时间、交通方式常常依赖固定介词搭配，建议整块记忆，不要只背单个词。",
    }
  }

  if (lowerCombined.includes("语序") || lowerCombined.includes("顺序") || lowerCombined.includes("word order")) {
    return {
      label: "本轮重点：语序",
      rule: "先完整模仿更正句的顺序，再替换其中的关键词，比逐词硬拼更稳定。",
    }
  }

  if (lowerCombined.includes("单复数") || lowerCombined.includes("plural") || lowerCombined.includes("冠词")) {
    return {
      label: "本轮重点：名词形式",
      rule: "名词数量变化时，通常要连同冠词、复数形式一起检查。",
    }
  }

  return {
    label: "本轮重点：先模仿再替换",
    rule: "先把更正句整句读顺，再替换一个时间、地点或人物信息，最容易形成自己的表达。",
  }
}

function resolveExplanation(correction: GrammarCorrection, focus: ReturnType<typeof deriveLearningFocus>) {
  const explanation = correction.explanation.trim()

  if (explanation && explanation !== "No specific issues found.") {
    return explanation
  }

  if (correction.original.trim() === correction.corrected.trim()) {
    return "这句话没有明显语法错误，当前更适合继续关注表达是否自然、是否顺口。"
  }

  return `优先记住这条规则：${focus.rule}`
}

export function GrammarFeedbackCard({ corrections, onSpeakText, isFallback = false }: GrammarFeedbackCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-3">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono">
          句法纠错 Grammar Check
        </span>

        {corrections.length > 0 ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-500">语法得分:</span>
            <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
              isFallback
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                : corrections[0].score >= 90
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                : corrections[0].score >= 70
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                : "bg-rose-50 text-rose-600"
            }`}>
              {isFallback ? "参考" : `${corrections[0].score}分`}
            </span>
          </div>
        ) : (
          <span className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/10 px-2 py-0.5 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" /> Perfect!
          </span>
        )}
      </div>

      {corrections.length > 0 ? (
        corrections.map((correction, index) => {
          const focus = deriveLearningFocus(correction)
          const explanation = resolveExplanation(correction, focus)

          return (
          <div key={index} className="space-y-2.5 text-xs">
            {!isFallback && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/15 dark:text-sky-200">
                <p className="font-bold">{focus.label}</p>
                <p className="mt-1">规则速记：{focus.rule}</p>
                <p className="mt-1 text-[10px] text-sky-700/90 dark:text-sky-300/90">先理解这一条，再看下面的完整更正句即可。</p>
              </div>
            )}
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-500 font-mono block">您的输入 Original:</span>
              <p className="line-through text-zinc-500 mt-0.5 font-mono bg-rose-50/20 dark:bg-rose-950/10 p-1.5 rounded border border-rose-50 dark:border-rose-950/20">
                {correction.original}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-600 font-mono block flex items-center gap-1">
                标准更正 Corrected:
                <button
                  onClick={() => onSpeakText(correction.corrected)}
                  className="p-0.5 text-zinc-400 hover:text-indigo-600 rounded"
                  title="听正确句子发发音"
                >
                  <Volume2 className="h-3 w-3" />
                </button>
              </span>
              <p className="text-zinc-900 dark:text-zinc-100 font-semibold font-mono mt-0.5 bg-emerald-50/20 dark:bg-emerald-950/15 p-1.5 rounded border border-emerald-50 dark:border-emerald-950/20">
                {correction.corrected}
              </p>
            </div>

            {correction.politeForm && (
              <div>
                <span className="text-[10px] font-bold text-indigo-500 block">地道表达 Native/Polite:</span>
                <p className="text-zinc-700 dark:text-zinc-300 italic mt-0.5">⭐ {correction.politeForm}</p>
              </div>
            )}

            <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-dashed border-amber-200 dark:border-zinc-800 rounded-lg p-2.5 text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
              <span className="font-semibold text-amber-700 dark:text-amber-500 flex items-center gap-1 mb-0.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {isFallback ? "参考说明" : "中文注释与原因"}
              </span>
              {explanation}
            </div>
          </div>
        )})
      ) : (
        <div className="text-center py-2">
          <p className="text-xs font-semibold text-emerald-600">语法非常完美，完美句式！</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">暂无需要纠错的语病。继续保持口语输出哦！</p>
        </div>
      )}
    </div>
  )
}
