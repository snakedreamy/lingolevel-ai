import { X, Settings2, Server, CheckCircle2 } from "lucide-react"
import { DifficultyLevel, Scenario, ProviderId } from "../types"
import type { ServerConfig } from "../lib/api"
import LevelSelector from "./LevelSelector"
import ScenarioCards from "./ScenarioCards"

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: DifficultyLevel;
  onLevelChange: (level: DifficultyLevel) => void;
  activeScenario: Scenario;
  onScenarioSelect: (scenario: Scenario) => void;
  serverConfig: ServerConfig | null;
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI 兼容",
  anthropic: "Anthropic",
};

const PROVIDER_API_KEY_ENV: Record<ProviderId, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

function providerLabel(provider: ProviderId) {
  return PROVIDER_LABELS[provider] ?? provider;
}

function apiKeyEnvName(provider: ProviderId) {
  return PROVIDER_API_KEY_ENV[provider] ?? "PROVIDER_API_KEY";
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 break-all font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-100">
        {value || "未配置"}
      </p>
    </div>
  );
}

export default function SettingsModal({
  isOpen,
  onClose,
  currentLevel,
  onLevelChange,
  activeScenario,
  onScenarioSelect,
  serverConfig,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4">
      <div className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-stone-50 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold sm:text-lg">偏好设置</h2>
              <p className="text-xs text-zinc-500">难度、场景与服务端连接状态</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                服务端连接（由 .env.local 控制）
              </h3>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              {serverConfig ? (
                <>
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      当前聊天与分析会直接使用下面这些服务端值。浏览器不会保存 API Key，也不会覆盖模型名称。
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ConfigRow label="Provider" value={providerLabel(serverConfig.provider)} />
                    <ConfigRow label="Base URL" value={serverConfig.baseUrl} />
                    <ConfigRow label="Chat model" value={serverConfig.chatModel} />
                    <ConfigRow label="Analyze model" value={serverConfig.analyzeModel} />
                  </div>
                  <p className="mt-3 text-[10.5px] leading-relaxed text-zinc-500">
                    API Key 只在服务端读取。当前 provider 对应的密钥变量是{" "}
                    <code className="mx-0.5 rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                      {apiKeyEnvName(serverConfig.provider)}
                    </code>
                    。修改 <code>.env.local</code> 后请重启服务。
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-xs text-zinc-500 dark:border-zinc-700">
                  正在读取服务端配置。如果这里长期为空，请确认 dev server 已启动且 <code>/api/server-config</code> 可访问。
                </div>
              )}
            </div>
          </section>

          <LevelSelector currentLevel={currentLevel} onLevelChange={onLevelChange} />
          <ScenarioCards
            activeScenarioId={activeScenario.id}
            onScenarioSelect={onScenarioSelect}
          />
        </div>

        <div className="flex justify-end border-t border-zinc-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
