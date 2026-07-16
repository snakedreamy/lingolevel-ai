import { Keyboard, Server, Settings2, X } from 'lucide-react'
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
    <div className="min-w-0 border-t border-zinc-200 py-2.5 first:border-t-0 dark:border-zinc-800">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 break-all font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-100">{value || '未配置'}</p>
    </div>
  )
}

export default function SettingsModal({
  isOpen, onClose, currentLevel, onLevelChange, activeScenario, onScenarioSelect,
  serverConfig, serverConfigError, sendOnCtrlEnter, onToggleSendOnCtrlEnter,
}: SettingsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title"
        className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-stone-50 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="settings-title" className="text-base font-bold sm:text-lg">学习设置</h2>
              <p className="text-xs text-zinc-500">难度、场景与输入习惯</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭设置"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          <LevelSelector currentLevel={currentLevel} onLevelChange={onLevelChange} />
          <ScenarioCards activeScenarioId={activeScenario.id} onScenarioSelect={onScenarioSelect} />

          <section className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <div className="mb-3 flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">输入偏好</h3>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Ctrl+Enter 发送</p>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">开启后，直接回车用于换行；Ctrl+Enter（Mac 上 Cmd+Enter）才发送。</p>
              </div>
              <button type="button" role="switch" aria-label="切换 Ctrl+Enter 发送" aria-checked={sendOnCtrlEnter}
                onClick={onToggleSendOnCtrlEnter}
                className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${sendOnCtrlEnter ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${sendOnCtrlEnter ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </section>

          <details className="group border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-2"><Server className="h-4 w-4 text-zinc-400" /> 服务连接信息</span>
              <span className={`h-2 w-2 rounded-full ${serverConfig ? 'bg-emerald-500' : serverConfigError ? 'bg-rose-500' : 'bg-amber-400'}`} />
            </summary>
            <div className="mt-4 rounded-xl bg-zinc-100/70 px-4 py-2 dark:bg-zinc-900">
              {serverConfig ? (
                <>
                  <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                    <ConfigRow label="Provider" value={PROVIDER_LABELS[serverConfig.provider]} />
                    <ConfigRow label="Base URL" value={serverConfig.baseUrl} />
                    <ConfigRow label="Chat model" value={serverConfig.chatModel} />
                    <ConfigRow label="Analyze model" value={serverConfig.analyzeModel} />
                    <ConfigRow label="Request timeout" value={`${Math.round(serverConfig.requestTimeoutMs / 1000)} 秒`} />
                    <ConfigRow label="Context window" value={`最近 ${serverConfig.maxContextMessages} 句`} />
                  </div>
                  <p className="border-t border-zinc-200 py-3 text-[10.5px] leading-5 text-zinc-500 dark:border-zinc-800">
                    API Key 仅由服务端读取，对应变量为 <code>{PROVIDER_API_KEY_ENV[serverConfig.provider]}</code>。修改 .env.local 后需重启服务。
                  </p>
                </>
              ) : (
                <p className="py-3 text-xs text-zinc-500">
                  {serverConfigError ? '读取失败，请确认服务端已经启动。' : '正在读取服务端配置…'}
                </p>
              )}
            </div>
          </details>
        </div>

        <footer className="flex justify-end border-t border-zinc-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 sm:py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
            完成
          </button>
        </footer>
      </div>
    </div>
  )
}
