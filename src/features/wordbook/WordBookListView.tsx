import { Trash2, Volume2 } from "lucide-react"
import type { WordItem } from "../../types"

interface WordBookListViewProps {
  wordList: WordItem[]
  onRemoveWord: (word: string) => void
  onSpeakWord: (word: string, event?: React.MouseEvent) => void
}

export function WordBookListView({
  wordList,
  onRemoveWord,
  onSpeakWord,
}: WordBookListViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {wordList.map((item) => (
        <div
          key={item.word}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition group"
        >
          <div className="flex justify-between items-start gap-1">
            <div>
              <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                {item.word}
                <button
                  onClick={(event) => onSpeakWord(item.word, event)}
                  className="p-1 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition cursor-pointer"
                  title="听发音"
                  aria-label={`播放 ${item.word} 的发音`}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </h4>
              <span className="text-xs font-mono text-zinc-400 block mt-0.5">{item.phonetic}</span>
            </div>
            <button
              onClick={() => onRemoveWord(item.word)}
              className="p-1 text-zinc-400 hover:text-rose-600 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer"
              title="移出生词本"
              aria-label={`移出生词本：${item.word}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mt-2 bg-indigo-50/40 dark:bg-indigo-950/20 px-2 py-1 rounded inline-block">
            {item.translation}
          </p>

          <div className="mt-3 text-xs border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
            <p className="font-medium text-zinc-700 dark:text-zinc-300 italic">“ {item.exampleEn} ”</p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">{item.exampleZh}</p>
          </div>

          <div className="text-[9px] text-zinc-400 mt-3 flex justify-between items-center bg-stone-50 dark:bg-zinc-800 px-2 py-0.5 rounded">
            <span>Added inside Chat</span>
            <span>{new Date(item.addTime).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
