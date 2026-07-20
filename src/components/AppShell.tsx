// src/components/AppShell.tsx — 页头与工作区导航
import { HelpCircle, Moon, Settings, Sun, Volume2 } from './Icon'
import { Dropdown, useSpeech } from './ui'
import type { BrowserPrefs } from '../types'

export type Workspace = 'learning' | 'fill-blank' | 'chat'

const WORKSPACES: Array<{ id: Workspace; code: string; label: string; hint: string }> = [
  { id: 'learning', code: '壹', label: '课程', hint: '系统学习：按课程掌握新知识' },
  { id: 'fill-blank', code: '贰', label: '填空', hint: '填词练习：自由生成与快速测试' },
  { id: 'chat', code: '叁', label: '会话', hint: '对话练习：自由表达与交流' },
]

export function AppHeader({
  theme, onToggleTheme, onOpenSettings, onOpenAsk, trailing,
}: {
  theme: BrowserPrefs['theme']
  onToggleTheme: () => void
  onOpenSettings: () => void
  onOpenAsk: () => void
  /** 右端追加按钮（如移动端的反馈面板开关），由当前工作区决定。 */
  trailing?: React.ReactNode
}) {
  const speech = useSpeech()
  return (
    <header className="app-header relative z-30 flex w-full flex-shrink-0 items-center justify-between gap-2 border-b-2 border-ink bg-paper px-3 py-2.5 dark:border-ink-dark dark:bg-paper-dark sm:px-6 sm:py-3">
      <div className="flex min-w-0 items-baseline gap-2.5">
        <h1 className="truncate font-display text-lg font-semibold leading-none tracking-tight sm:text-xl">
          LingoLevel&nbsp;AI
        </h1>
        <span className="margin-code hidden sm:inline">语法 · 对话 · 练习</span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
        <button type="button" onClick={onToggleTheme}
          className="ui-btn ui-btn-icon"
          title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
          aria-label={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <Dropdown label="打开发音设置"
          summary={<><Volume2 className="h-4 w-4" /><span className="hidden sm:inline">发音</span></>}>
          <p className="margin-code">发音设置</p>
          <div className="mt-3 grid grid-cols-2 gap-2" aria-label="口音">
            {(['us', 'uk'] as const).map((accent) => (
              <button key={accent} type="button" onClick={() => speech.setAccent(accent)} aria-pressed={speech.accent === accent}
                className={`h-9 cursor-pointer rounded-md border text-xs font-semibold transition ${speech.accent === accent
                  ? 'border-forest bg-forest/10 text-forest dark:border-forest-dark dark:bg-forest-dark/10 dark:text-forest-dark'
                  : 'ui-btn'}`}>
                {accent === 'us' ? '美音 US' : '英音 UK'}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-3">
            <span className="text-xs font-semibold ui-text-muted">语速</span>
            <input type="range" min="0.5" max="1.5" step="0.1" value={speech.speed}
              onChange={(event) => speech.setSpeed(Number(event.target.value))}
              className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg bg-ink/15 accent-forest dark:bg-ink-dark/20 dark:accent-forest-dark" />
            <output className="w-9 text-right font-mono text-xs font-bold text-forest dark:text-forest-dark">{speech.speed.toFixed(1)}x</output>
          </label>
        </Dropdown>

        <button type="button" onClick={onOpenAsk} className="ui-btn" title="打开答疑助手">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">答疑</span>
        </button>

        <button type="button" onClick={onOpenSettings} aria-label="打开偏好设置" className="ui-btn">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">偏好设置</span>
        </button>

        {trailing}
      </div>
    </header>
  )
}

export function WorkspaceNav({ workspace, onSelect }: {
  workspace: Workspace
  onSelect: (next: Workspace) => void
}) {
  return (
    <nav className="app-workspace-nav mb-2.5 flex shrink-0 items-stretch gap-0 border-b ui-rule sm:mb-3 sm:w-fit" aria-label="学习模式">
      {WORKSPACES.map((item) => {
        const active = workspace === item.id
        return (
          <button key={item.id} type="button" title={item.hint} aria-label={item.hint}
            onClick={() => onSelect(item.id)} aria-current={active ? 'page' : undefined}
            className={`relative flex h-11 flex-1 cursor-pointer items-baseline justify-center gap-2 px-3 transition sm:flex-none sm:px-5 ${active
              ? ''
              : 'ui-text-faint hover:text-ink dark:hover:text-ink-dark'}`}>
            <span className={`margin-code ${active ? '!text-scarlet dark:!text-scarlet-dark' : ''}`}>{item.code}</span>
            <span className={`font-display text-base ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            {active && <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 bg-scarlet dark:bg-scarlet-dark" />}
          </button>
        )
      })}
    </nav>
  )
}
