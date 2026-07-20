// src/components/ui.tsx — 跨工作区共享的界面原语与上下文
// ui-* 工具类在 index.css 中定义（token 驱动），这里只保留带行为的组件。
import { createContext, useContext } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Volume2, X } from './Icon'
import type { SpeechPlayer } from '../lib/speech'

// ─── 跨工作区共享的服务 ──────────────────────────────────────────────────
// 发音播放器在 App 创建一次，通过 context 传给各工作区，
// 避免每个组件把 speech 透传三四层。

const SpeechContext = createContext<SpeechPlayer | null>(null)

export const SpeechProvider = SpeechContext.Provider

export function useSpeech(): SpeechPlayer {
  const speech = useContext(SpeechContext)
  if (!speech) throw new Error('useSpeech 必须在 <SpeechProvider> 内使用')
  return speech
}

/** 便捷方法：speak(id, text, label)，active 状态由 SpeechButton 自行读取。 */
export type SpeakFn = (id: string, text: string, label?: string) => void

// ─── EmptyState ──────────────────────────────────────────────────────────

export function EmptyState({ icon, title, hint, className = '' }: {
  icon?: ReactNode
  title: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex h-full flex-col items-center justify-center gap-2 p-6 text-center ${className}`}>
      {icon && (
        <div className="mb-2 grid h-12 w-12 place-items-center rounded-full border ui-rule ui-text-faint">
          {icon}
        </div>
      )}
      <p className="text-xs font-semibold ui-text-muted">{title}</p>
      {hint && <p className="max-w-xs text-[11px] leading-5 ui-text-faint">{hint}</p>}
    </div>
  )
}

// ─── Toast：底部居中的瞬时状态提示（朗读通知等） ─────────────────────────

export function Toast({ kind = 'info', children, onDismiss, className = '' }: PropsWithChildren<{
  kind?: 'info' | 'error'
  onDismiss?: () => void
  className?: string
}>) {
  return (
    <div role="status" aria-live="polite"
      className={`fixed bottom-4 left-1/2 z-[70] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur animate-slide-up ${kind === 'error'
        ? 'border-scarlet/40 bg-scarlet/10 text-scarlet dark:border-scarlet-dark/50 dark:bg-scarlet-dark/15 dark:text-scarlet-dark'
        : 'ui-sheet ui-text-muted'} ${className}`}>
      {children}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="关闭提示" className="ml-1 rounded p-0.5 opacity-60 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function SpeechNoticeToast() {
  const speech = useSpeech()
  if (!speech.notice) return null
  const isError = speech.notice.kind === 'error'
  return (
    <Toast kind={speech.notice.kind} onDismiss={speech.clearNotice}>
      <Volume2 className={`h-4 w-4 shrink-0 ${isError ? '' : 'text-forest dark:text-forest-dark'}`} />
      <span className="min-w-0 text-center">{speech.notice.message}</span>
      {speech.activeId && (
        <button type="button" onClick={speech.stop}
          className="ml-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-bold text-paper dark:bg-ink-dark dark:text-paper-dark">
          停止
        </button>
      )}
    </Toast>
  )
}

// ─── Dropdown：轻量弹出容器（header 发音设置等） ─────────────────────────

export function Dropdown({ summary, label, children, className = '' }: PropsWithChildren<{
  summary: ReactNode
  label: string
  className?: string
}>) {
  return (
    <details className={`group relative ${className}`}>
      <summary aria-label={label}
        className="ui-btn cursor-pointer list-none">
        {summary}
      </summary>
      <div className="ui-sheet fixed inset-x-4 top-16 z-[60] w-auto rounded-lg border p-4 shadow-xl animate-fade-in sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+.5rem)] sm:w-72">
        {children}
      </div>
    </details>
  )
}

// ─── Drawer：底部抽屉（移动端反馈面板）与侧边抽屉（答疑） ────────────────

export function BottomDrawer({ title, onClose, children }: PropsWithChildren<{
  title: ReactNode
  onClose: () => void
}>) {
  return (
    <div className="ui-overlay fixed inset-0 z-40 lg:hidden" onClick={onClose}>
      <div role="dialog" aria-modal="true"
        className="ui-sheet absolute inset-x-0 bottom-0 flex max-h-[82dvh] min-h-[58dvh] flex-col overflow-hidden rounded-t-2xl border-t-2 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b ui-rule px-4 py-3">
          <p className="margin-code">{title}</p>
          <button type="button" onClick={onClose} className="ui-btn ui-btn-icon" aria-label="关闭面板">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

/** 非模态侧抽屉：不遮罩主区，用户可一边看主对话一边使用。 */
export function SideDrawer({ title, subtitle, actions, onClose, children }: PropsWithChildren<{
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  onClose: () => void
}>) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex justify-end animate-fade-in">
      <aside role="complementary"
        className="ui-sheet pointer-events-auto flex h-full w-full max-w-md flex-col border-l-2 shadow-2xl">
        <div className="flex items-center justify-between border-b ui-rule px-4 py-3">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <h2 className="font-display text-base font-semibold">{title}</h2>
            {subtitle && <span className="margin-code">{subtitle}</span>}
          </div>
          <div className="flex items-center gap-1">
            {actions}
            <button type="button" onClick={onClose} aria-label="关闭" className="ui-btn ui-btn-icon border-transparent">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {children}
      </aside>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────

export function Modal({ title, icon, onClose, children, footer, wide = false }: PropsWithChildren<{
  title: ReactNode
  icon?: ReactNode
  onClose: () => void
  footer?: ReactNode
  wide?: boolean
}>) {
  return (
    <div className="ui-overlay fixed inset-0 z-50 flex animate-fade-in items-end justify-center p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true"
        className={`ui-sheet flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t-2 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:border-2 ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b ui-rule px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="font-display text-lg font-semibold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className="ui-btn ui-btn-icon border-transparent">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="ui-scroll flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
        {footer && (
          <footer className="flex justify-end gap-3 border-t ui-rule px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

// ─── Switch ───────────────────────────────────────────────────────────────

export function Switch({ checked, onToggle, label }: {
  checked: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={onToggle}
      className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-forest dark:bg-forest-dark' : 'bg-ink/25 dark:bg-ink-dark/30'}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-paper shadow-sm transition-transform dark:bg-paper-dark ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}
