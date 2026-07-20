import { Bot, Keyboard, Server, Settings2 } from './Icon'
import type { DifficultyLevel, ProviderId, Scenario } from '../types'
import type { ServerConfig } from '../lib/api'
import { Modal, Switch } from './ui'
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
    <div className="min-w-0 border-t ui-rule py-2.5 first:border-t-0">
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
    <Modal wide onClose={onClose}
      title="学习设置"
      icon={<Settings2 className="h-5 w-5 text-forest dark:text-forest-dark" />}
      footer={
        <button type="button" onClick={onClose} className="ui-btn ui-btn-primary">
          完成
        </button>
      }>
      <div className="space-y-6">
        <LevelSelector currentLevel={currentLevel} onLevelChange={onLevelChange} />
        <ScenarioCards activeScenarioId={activeScenario.id} onScenarioSelect={onScenarioSelect} />

        <section className="border-t ui-rule pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-4.5 w-4.5 text-forest dark:text-forest-dark" />
            <h3 className="text-sm font-bold">模型</h3>
          </div>
          <label htmlFor="active-model" className="sr-only">后续请求使用的模型</label>
          <select id="active-model" value={currentModelId} disabled={!serverConfig}
            onChange={(event) => onModelChange(event.target.value)}
            className="ui-input h-11 font-mono text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
            <option value="" className="bg-leaf text-ink dark:bg-leaf-dark dark:text-ink-dark">按任务使用服务端默认模型</option>
            {serverConfig?.availableModels.map((model) => (
              <option key={model} value={model} className="bg-leaf text-ink dark:bg-leaf-dark dark:text-ink-dark">{model}</option>
            ))}
          </select>
        </section>

        <section className="border-t ui-rule pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Keyboard className="h-4.5 w-4.5 text-forest dark:text-forest-dark" />
            <h3 className="text-sm font-bold">输入偏好</h3>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-ink/85 dark:text-ink-dark/85">Ctrl+Enter 发送</p>
              <p className="mt-1 text-[11px] leading-5 ui-text-faint">开启后，Enter 换行，Ctrl/Cmd+Enter 发送。</p>
            </div>
            <Switch checked={sendOnCtrlEnter} onToggle={onToggleSendOnCtrlEnter} label="切换 Ctrl+Enter 发送" />
          </div>
        </section>

        <details className="group border-t ui-rule pt-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold ui-text-muted">
            <span className="flex items-center gap-2"><Server className="h-4 w-4 ui-text-faint" /> 服务连接信息</span>
            <span className={`h-2 w-2 rounded-full ${serverConfig ? 'bg-forest dark:bg-forest-dark' : serverConfigError ? 'bg-scarlet dark:bg-scarlet-dark' : 'bg-gilt dark:bg-gilt-dark'}`} />
          </summary>
          <div className="ui-surface mt-4 px-4 py-2">
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
                <p className="border-t ui-rule py-3 text-[10.5px] leading-5 ui-text-faint">
                  API Key 仅由服务端读取，对应变量为 <code>{PROVIDER_API_KEY_ENV[serverConfig.provider]}</code>。修改 .env.local 后需重启服务。
                </p>
              </>
            ) : (
              <p className="py-3 text-xs ui-text-faint">
                {serverConfigError ? '读取失败，请确认服务端已经启动。' : '正在读取服务端配置…'}
              </p>
            )}
          </div>
        </details>
      </div>
    </Modal>
  )
}
