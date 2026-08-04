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
    ? 'h-9 min-w-9 border border-input-border bg-surface px-2.5'
    : 'h-7 min-w-7 px-1.5'
  const toneClass = tone === 'inverse'
    ? active ? 'bg-on-accent/20 text-on-accent' : 'text-on-accent/70 hover:bg-on-accent/15 hover:text-on-accent'
    : active
      ? 'bg-accent-tint-hover-bg text-accent'
      : 'ui-text-faint hover:bg-muted-bg hover:text-accent'

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
