import type { AnalysisResult, WordItem } from "../../types"
import { Plus, Check, Volume2 } from "lucide-react"

interface VocabularyCardsSectionProps {
  keyWords: AnalysisResult["keyWords"]
  isWordSaved: (word: string) => boolean
  onAddWord: (word: WordItem) => boolean
  onSpeakText: (text: string) => void
}

export function VocabularyCardsSection({
  keyWords,
  isWordSaved,
  onAddWord,
  onSpeakText,
}: VocabularyCardsSectionProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-3">
      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono block w-max">
        本轮生词析卡 Vocabulary Cards
      </span>

      {keyWords.length > 0 ? (
        <div className="space-y-4">
          {keyWords.map((item, index) => {
            const saved = isWordSaved(item.word)
            return (
              <div
                key={index}
                className="p-3 bg-stone-50/40 dark:bg-zinc-950/30 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-1.5 transition-all relative group"
              >
                <button
                  onClick={() => {
                    if (saved) return
                    onAddWord({
                      word: item.word,
                      phonetic: item.phonetic,
                      translation: item.definition,
                      exampleEn: item.exampleEn,
                      exampleZh: item.exampleZh,
                      addTime: Date.now(),
                    })
                  }}
                  disabled={saved}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1 transition-all ${
                    saved
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900 cursor-default"
                      : "bg-white text-indigo-600 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-50 hover:border-indigo-300 cursor-pointer"
                  }`}
                >
                  {saved ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span>已收集</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      <span>+加词本</span>
                    </>
                  )}
                </button>

                <div className="pr-16">
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                    {item.word}
                    <button
                      onClick={() => onSpeakText(item.word)}
                      className="p-0.5 text-zinc-400 hover:text-indigo-600 rounded"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">{item.phonetic}</span>
                </div>

                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">{item.definition}</p>

                <div className="bg-white dark:bg-zinc-900/60 p-2 rounded border border-zinc-100 dark:border-zinc-800 text-[10.5px]">
                  <p className="text-[10px] text-zinc-400 font-semibold italic">Example (双语例句):</p>
                  <p className="text-zinc-700 dark:text-zinc-300 mt-0.5 italic text-[11px] leading-tight font-medium">
                    “ {item.exampleEn} ”
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1">{item.exampleZh}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-400 text-center py-2">本回合暂无重点抽取的新单词。</p>
      )}
    </div>
  )
}
