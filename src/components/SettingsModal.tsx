import { Bot, Keyboard, Server, Settings2, X } from './Icon'
import type { DifficultyLevel, ProviderId, Scenario } from '../types'
import type { ServerConfig } from '../lib/api'
import LevelSelector from './LevelSelector'
import ScenarioCards from './ScenarioCards'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentLevel: DifficultyLevel
  onLevelChange: (level: DifficultyLevel) => void
  activeScenario: Scenario
  onScenarioSelect: (scenario: Scenario) => void
  serverConfig: ServerConfig | null
  serverConfigError?: boolean
  currentModelId: string
  onModelChange: (modelId: string) => void
  sendOnCtrlEnter: boolean
  onToggleSendOnCtrlEnter: () => void
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: 'OpenAI 兼容',
  anthropic: 'Anthropic',
}

const PROVIDER_API_KEY_ENV: Record<ProviderId, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-t border-ink/10 py-2.5 first:border-t-0 dark:border-ink-dark/15">
      <p className="margin-code">{label}</p>
      <p className="mt-1 break-all font-mono text-xs font-semibold text-ink/85 dark:text-ink-dark/85">{value || '未配置'}</p>
    </div>
  )
}

export default function SettingsModal({
  isOpen, onClose, currentLevel, onLevelChange, activeScenario, onScenarioSelect,
  serverConfig, serverConfigError, currentModelId, onModelChange, sendOnCtrlEnter, onToggleSendOnCtrlEnter,
}: SettingsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title"
        className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t-2 border-ink bg-paper shadow-2xl dark:border-ink-dark dark:bg-paper-dark sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-lg sm:border-2">
        <header className="flex items-center justify-between border-b border-ink/15 px-4 py-3 dark:border-ink-dark/20 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 text-ink dark:text-ink-dark">
            <Settings2 className="h-5 w-5 text-forest dark:text-forest-dark" />
            <h2 id="settings-title" className="font-display text-lg font-semibold">学习设置</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭设置"
            className="rounded-md p-2 text-ink/50 transition hover:bg-ink/5 hover:text-ink dark:text-ink-dark/50 dark:hover:bg-ink-dark/10 dark:hover:text-ink-dark">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          <LevelSelector currentLevel={currentLevel} onLevelChange={onLevelChange} />
          <ScenarioCards activeScenarioId={activeScenario.id} onScenarioSelect={onScenarioSelect} />

          <section className="border-t border-ink/15 pt-5 dark:border-ink-dark/20">
            <div className="mb-3 flex items-center gap-2">
              <Bot className="h-4.5 w-4.5 text-forest dark:text-forest-dark" />
              <h3 className="text-sm font-bold text-ink dark:text-ink-dark">模型</h3>
            </div>
            <label htmlFor="active-model" className="sr-only">后续请求使用的模型</label>
            <select id="active-model" value={currentModelId} disabled={!serverConfig}
              onChange={(event) => onModelChange(event.target.value)}
              className="h-11 w-full rounded-md border border-ink/20 bg-leaf px-3 font-mono text-xs font-semibold text-ink outline-none transition focus:border-forest focus:ring-1 focus:ring-forest/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-dark/25 dark:bg-leaf-dark dark:text-ink-dark dark:[color-scheme:dark] dark:focus:border-forest-dark">
              <option value="" className="bg-leaf text-ink dark:bg-leaf-dark dark:text-ink-dark">按任务使用服务端默认模型</option>
              {serverConfig?.availableModels.map((model) => (
                <option key={model} value={model} className="bg-leaf text-ink dark:bg-leaf-dark dark:text-ink-dark">{model}</option>
              ))}
            </select>
          </section>

          <section className="border-t border-ink/15 pt-5 dark:border-ink-dark/20">
            <div className="mb-3 flex items-center gap-2">
              <Keyboard className="h-4.5 w-4.5 text-forest dark:text-forest-dark" />
              <h3 className="text-sm font-bold text-ink dark:text-ink-dark">输入偏好</h3>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-ink/85 dark:text-ink-dark/85">Ctrl+Enter 发送</p>
                <p className="mt-1 text-[11px] leading-5 text-ink/50 dark:text-ink-dark/50">开启后，Enter 换行，Ctrl/Cmd+Enter 发送。</p>
              </div>
              <button type="button" role="switch" aria-label="切换 Ctrl+Enter 发送" aria-checked={sendOnCtrlEnter}
                onClick={onToggleSendOnCtrlEnter}
                className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${sendOnCtrlEnter ? 'bg-forest dark:bg-forest-dark' : 'bg-ink/25 dark:bg-ink-dark/30'}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-paper shadow-sm transition-transform dark:bg-paper-dark ${sendOnCtrlEnter ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </section>

          <details className="group border-t border-ink/15 pt-5 dark:border-ink-dark/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink/80 dark:text-ink-dark/80">
              <span className="flex items-center gap-2"><Server className="h-4 w-4 text-ink/45 dark:text-ink-dark/45" /> 服务连接信息</span>
              <span className={`h-2 w-2 rounded-full ${serverConfig ? 'bg-forest dark:bg-forest-dark' : serverConfigError ? 'bg-scarlet dark:bg-scarlet-dark' : 'bg-gilt dark:bg-gilt-dark'}`} />
            </summary>
            <div className="mt-4 rounded-md border border-ink/10 bg-leaf px-4 py-2 dark:border-ink-dark/15 dark:bg-leaf-dark">
              {serverConfig ? (
                <>
                  <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                    <ConfigRow label="Provider" value={PROVIDER_LABELS[serverConfig.provider]} />
                    <ConfigRow label="Base URL" value={serverConfig.baseUrl} />
                    <ConfigRow label="Chat model" value={serverConfig.chatModel} />
                    <ConfigRow label="Analyze model" value={serverConfig.analyzeModel} />
                    <ConfigRow label="Allowed models" value={serverConfig.availableModels.join(', ')} />
                    <ConfigRow label="Request timeout" value={`${Math.round(serverConfig.requestTimeoutMs / 1000)} 秒`} />
                    <ConfigRow label="Max output" value={`${serverConfig.maxOutputTokens} tokens`} />
                    <ConfigRow label="Context window" value={`最近 ${serverConfig.maxContextMessages} 句`} />
                    <ConfigRow label="Fill-blank batch" value={`${serverConfig.fillBlankBatchSize} 题 / 次`} />
                    <ConfigRow label="Fill-blank validation" value={`${serverConfig.fillBlankAttempts} 次`} />
                  </div>
                  <p className="border-t border-ink/10 py-3 text-[10.5px] leading-5 text-ink/50 dark:border-ink-dark/15 dark:text-ink-dark/50">
                    API Key 仅由服务端读取，对应变量为 <code>{PROVIDER_API_KEY_ENV[serverConfig.provider]}</code>。修改 .env.local 后需重启服务。
                  </p>
                </>
              ) : (
                <p className="py-3 text-xs text-ink/50 dark:text-ink-dark/50">
                  {serverConfigError ? '读取失败，请确认服务端已经启动。' : '正在读取服务端配置…'}
                </p>
              )}
            </div>
          </details>
        </div>

        <footer className="flex justify-end border-t border-ink/15 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-ink-dark/20 sm:px-6 sm:py-4">
          <button type="button" onClick={onClose}
            className="rounded-md bg-forest px-4 py-2 text-xs font-bold text-paper transition hover:bg-forest/90 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90">
            完成
          </button>
        </footer>
      </div>
    </div>
  )
}
