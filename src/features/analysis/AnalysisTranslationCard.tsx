interface AnalysisTranslationCardProps {
  translation: string
}

export function AnalysisTranslationCard({ translation }: AnalysisTranslationCardProps) {
  return (
    <div className="bg-stone-50/70 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono">
          对照翻译 Translation
        </span>
        <span className="text-[10px] text-zinc-400">自动捕捉</span>
      </div>
      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
        {translation || "暂无翻译数据。"}
      </p>
    </div>
  )
}
