import { ArrowLeftRight, CheckCircle, HelpCircle, Layers, TrendingUp, Volume2 } from "lucide-react"
import type { WordItem } from "../../types"

interface WordBookFlashcardViewProps {
  wordList: WordItem[]
  activeFlashCard: WordItem | undefined
  safeFlashCardIndex: number
  isFlipped: boolean
  onToggleFlip: () => void
  onPrevCard: () => void
  onNextCard: () => void
  onRemoveWord: (word: string) => void
  onSpeakWord: (word: string, event?: React.MouseEvent) => void
}

export function WordBookFlashcardView({
  wordList,
  activeFlashCard,
  safeFlashCardIndex,
  isFlipped,
  onToggleFlip,
  onPrevCard,
  onNextCard,
  onRemoveWord,
  onSpeakWord,
}: WordBookFlashcardViewProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto">
      <div
        onClick={onToggleFlip}
        className={`w-full aspect-[1.6/1] bg-white dark:bg-zinc-900 border-2 ${
          isFlipped ? "border-indigo-500 bg-indigo-50/5 dark:bg-zinc-[900]" : "border-zinc-200 dark:border-zinc-800"
        } rounded-2xl p-6 shadow-md cursor-pointer flex flex-col items-center justify-center relative hover:shadow-lg transition-all duration-300 transform select-none`}
      >
        <div className="absolute top-3 left-4 flex items-center gap-1.5 text-[10px] text-zinc-400">
          <Layers className="h-3 w-3" />
          <span>Card {safeFlashCardIndex + 1} of {wordList.length}</span>
        </div>

        <div className="absolute top-3 right-4 flex items-center gap-1 text-[10px] text-indigo-500 font-medium">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span>点击卡片翻面 (Click to Flip)</span>
        </div>

        {!isFlipped ? (
          <div className="text-center animate-fade-in flex flex-col items-center">
            <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
              {activeFlashCard?.word}
              <button
                onClick={(event) => onSpeakWord(activeFlashCard?.word ?? "", event)}
                className="p-1 px-1.5 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 text-indigo-600"
                aria-label={activeFlashCard ? `播放 ${activeFlashCard.word} 的发音` : "播放当前单词发音"}
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </h3>
            <p className="text-sm font-mono text-zinc-400 mt-2">{activeFlashCard?.phonetic || "/-/"}</p>
            <div className="mt-8 px-4 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-xs flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
              <span>还记得它的意思吗？点击翻牌</span>
            </div>
          </div>
        ) : (
          <div className="text-center animate-fade-in w-full">
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full">
              中文释义
            </span>
            <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-300 mt-3">
              {activeFlashCard?.translation}
            </h3>

            <div className="mt-5 text-left bg-stone-50 dark:bg-zinc-950/50 p-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 max-w-md mx-auto">
              <p className="text-xs font-semibold text-zinc-400">例句 (Example):</p>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-1 italic leading-relaxed">
                “ {activeFlashCard?.exampleEn} ”
              </p>
              <p className="text-xs text-zinc-500 mt-1">{activeFlashCard?.exampleZh}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center mt-6 w-full">
        <button
          onClick={onPrevCard}
          className="flex-1 py-2 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer"
        >
          上一个 (Previous)
        </button>
        <button
          onClick={() => {
            if (activeFlashCard) onRemoveWord(activeFlashCard.word)
          }}
          className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
          title="标记为熟记，斩掉这个词"
        >
          <CheckCircle className="h-4 w-4" />
          已掌握 (Remove)
        </button>
        <button
          onClick={onNextCard}
          className="flex-1 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm cursor-pointer"
        >
          下一个 (Next Card)
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
        <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
        <span>卡片式循环能够激活您的第二脑，强化右脑视觉记忆。</span>
      </div>
    </div>
  )
}
