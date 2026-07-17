import { Square, Volume2 } from 'lucide-react'

interface SpeechButtonProps {
  active: boolean
  label: string
  onClick: () => void
  size?: 'sm' | 'md'
  tone?: 'default' | 'inverse'
  showText?: boolean
}

export default function SpeechButton({
  active, label, onClick, size = 'sm', tone = 'default', showText = false,
}: SpeechButtonProps) {
  const actionLabel = active ? `停止朗读${label}` : `朗读${label}`
  const sizeClass = size === 'md'
    ? 'h-9 min-w-9 border border-zinc-200 bg-white px-2.5 dark:border-zinc-700 dark:bg-zinc-900'
    : 'h-7 min-w-7 px-1.5'
  const toneClass = tone === 'inverse'
    ? active ? 'bg-white/20 text-white' : 'text-indigo-100 hover:bg-white/15 hover:text-white'
    : active
      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300'
      : 'text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800 dark:hover:text-indigo-300'

  return (
    <button type="button" onClick={onClick} aria-label={actionLabel} aria-pressed={active} title={actionLabel}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg transition ${sizeClass} ${toneClass}`}>
      {active
        ? <Square className="h-3 w-3 fill-current animate-pulse" />
        : <Volume2 className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />}
      {showText && <span className="text-[10px] font-semibold">{active ? '停止' : '朗读'}</span>}
    </button>
  )
}
