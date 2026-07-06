import { X } from "lucide-react"
import AnalysisSidebar from "../components/AnalysisSidebar"
import type { AnalysisResult, WordItem } from "../types"

interface MobileAnalysisDrawerProps {
  analysis: AnalysisResult | null
  isLoading: boolean
  onAddWord: (word: WordItem) => boolean
  isWordSaved: (word: string) => boolean
  onSelectSuggestion: (text: string) => void
  onClose: () => void
}

export default function MobileAnalysisDrawer({
  analysis,
  isLoading,
  onAddWord,
  isWordSaved,
  onSelectSuggestion,
  onClose,
}: MobileAnalysisDrawerProps) {
  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[82dvh] min-h-[58dvh] flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">反馈与建议</p>
            <p className="text-[11px] text-zinc-500">上滑查看翻译、纠错、生词与接话建议</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 p-2 text-zinc-500 dark:border-zinc-800 dark:text-zinc-300"
            aria-label="关闭反馈面板"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <AnalysisSidebar
            analysis={analysis}
            isLoading={isLoading}
            onAddWord={onAddWord}
            isWordSaved={isWordSaved}
            onSelectSuggestion={(text) => {
              onSelectSuggestion(text)
              onClose()
            }}
          />
        </div>
      </div>
    </div>
  )
}
