import { BookMarked, Menu, Moon, Settings, Sun, X } from "lucide-react"
import type { BrowserPrefs } from "../types"

interface AppHeaderProps {
  theme: BrowserPrefs["theme"]
  savedWordsCount: number
  showMobileSidebar: boolean
  onToggleTheme: () => void
  onOpenSettings: () => void
  onOpenWordBook: () => void
  onToggleMobileSidebar: () => void
}

export default function AppHeader({
  theme,
  savedWordsCount,
  showMobileSidebar,
  onToggleTheme,
  onOpenSettings,
  onOpenWordBook,
  onToggleMobileSidebar,
}: AppHeaderProps) {
  return (
    <header className="flex-shrink-0 w-full bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 shadow-xs">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="h-8 w-8 sm:h-9 sm:w-9 bg-indigo-600 rounded-xl flex flex-shrink-0 items-center justify-center text-white font-black text-lg shadow-sm">
          E
        </div>
        <div className="min-w-0">
          <h1 className="text-[13px] sm:text-[15px] font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
            英语口语 AI 智能教练
            <span className="hidden sm:inline text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.2 rounded font-bold">
              Level-Adaptive
            </span>
          </h1>
          <p className="hidden text-[11px] text-zinc-500 font-medium sm:block">
            专为中国用户打磨的沉浸式智能纠错英语学习沙盒
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3">
        <button
          onClick={onToggleTheme}
          className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-2 text-xs font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 sm:px-3 sm:py-1.5 cursor-pointer"
          aria-label="打开偏好设置"
          title="偏好设置"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">偏好设置</span>
        </button>

        <button
          onClick={onOpenWordBook}
          className="relative flex items-center gap-1.5 rounded-xl bg-indigo-50 px-2.5 py-2 text-xs font-bold text-indigo-600 shadow-xs transition hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900/60 sm:px-3 sm:py-1.5 cursor-pointer"
          aria-label={`打开我的生词本${savedWordsCount > 0 ? `，${savedWordsCount} 个词` : ""}`}
          title="我的生词本"
        >
          <BookMarked className="h-4 w-4" />
          <span className="hidden sm:inline">我的生词本</span>
          {savedWordsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full h-4.5 w-4.5 text-[9px] font-black flex items-center justify-center scale-95 animate-pulse">
              {savedWordsCount}
            </span>
          )}
        </button>

        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900"
          title="实时语法翻译纠错"
          aria-label={showMobileSidebar ? "关闭反馈与建议面板" : "打开反馈与建议面板"}
        >
          {showMobileSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
    </header>
  )
}
