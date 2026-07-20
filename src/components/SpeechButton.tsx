import { Square, Volume2 } from './Icon'

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
    ? 'h-9 min-w-9 border border-ink/20 bg-leaf px-2.5 dark:border-ink-dark/25 dark:bg-leaf-dark'
    : 'h-7 min-w-7 px-1.5'
  const toneClass = tone === 'inverse'
    ? active ? 'bg-paper/20 text-paper dark:bg-paper-dark/20 dark:text-paper-dark' : 'text-paper/70 hover:bg-paper/15 hover:text-paper dark:text-paper-dark/70 dark:hover:bg-paper-dark/15 dark:hover:text-paper-dark'
    : active
      ? 'bg-forest/10 text-forest dark:bg-forest-dark/15 dark:text-forest-dark'
      : 'text-ink/40 hover:bg-ink/5 hover:text-forest dark:text-ink-dark/40 dark:hover:bg-ink-dark/10 dark:hover:text-forest-dark'

  return (
    <button type="button" onClick={onClick} aria-label={actionLabel} aria-pressed={active} title={actionLabel}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md transition ${sizeClass} ${toneClass}`}>
      {active
        ? <Square className="h-3 w-3 fill-current animate-pulse" />
        : <Volume2 className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />}
      {showText && <span className="text-[10px] font-semibold">{active ? '停止' : '朗读'}</span>}
    </button>
  )
}
