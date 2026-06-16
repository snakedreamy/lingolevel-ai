import { useState, useEffect } from "react";
import { X, Settings2, Server, AlertTriangle } from "lucide-react";
import { DifficultyLevel, Scenario, BrowserPrefs, ProviderId } from "../types";
import LevelSelector from "./LevelSelector";
import ScenarioCards from "./ScenarioCards";
import { AVAILABLE_MODELS, DEFAULT_CHAT_MODEL, DEFAULT_ANALYZE_MODEL } from "../models";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: DifficultyLevel;
  onLevelChange: (level: DifficultyLevel) => void;
  activeScenario: Scenario;
  onScenarioSelect: (scenario: Scenario) => void;
  prefs: BrowserPrefs;
  onSavePrefs: (next: BrowserPrefs) => void;
  serverConfig: {
    provider: ProviderId;
    chatModel: string;
    analyzeModel: string;
    baseUrl: string;
  } | null;
  configMismatch: boolean;
  onDismissMismatch: () => void;
}

const PROVIDER_OPTIONS: ProviderId[] = ["openai", "anthropic"];

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI 兼容",
  anthropic: "Anthropic",
};

const PROVIDER_API_KEY_ENV: Record<ProviderId, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

export default function SettingsModal({
  isOpen,
  onClose,
  currentLevel,
  onLevelChange,
  activeScenario,
  onScenarioSelect,
  prefs,
  onSavePrefs,
  serverConfig,
  configMismatch,
  onDismissMismatch,
}: SettingsModalProps) {
  // Initial draft seeded from prop on first render.
  const [draft, setDraft] = useState<BrowserPrefs>(prefs);

  // Re-seed draft when the modal transitions from closed -> open so external
  // changes to `prefs` (e.g. another tab editing localStorage) are reflected
  // without trampling any in-progress edits the user has already made.
  useEffect(() => {
    if (isOpen) {
      setDraft(prefs);
    }
  }, [isOpen, prefs]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = {
      ...draft,
      chatModel: draft.chatModel.trim(),
      analyzeModel: draft.analyzeModel.trim(),
    };
    onSavePrefs(trimmed);
    onClose();
  };

  const setProvider = (provider: ProviderId) => {
    // Switching provider resets both model fields to the default. The
    // dropdown only shows models valid for the new provider, so the user
    // would otherwise see an empty/invalid selection until they manually
    // pick something.
    const models = modelsForProvider(provider);
    setDraft({
      ...draft,
      provider,
      chatModel: models[0]?.id ?? DEFAULT_CHAT_MODEL,
      analyzeModel: models[0]?.id ?? DEFAULT_ANALYZE_MODEL
    });
  };

  const modelsForProvider = (provider: ProviderId) =>
    AVAILABLE_MODELS.filter((m) => m.provider === provider);

  const availableModels = modelsForProvider(draft.provider);

  // If the current draft value isn't in the available list (e.g. from old
  // localStorage data), fall back to the first available option so the
  // <select> always has a valid value selected.
  const effectiveChatModel = availableModels.find((m) => m.id === draft.chatModel)
    ? draft.chatModel
    : (availableModels[0]?.id ?? DEFAULT_CHAT_MODEL);
  const effectiveAnalyzeModel = availableModels.find((m) => m.id === draft.analyzeModel)
    ? draft.analyzeModel
    : (availableModels[0]?.id ?? DEFAULT_ANALYZE_MODEL);

  const apiKeyEnvName = PROVIDER_API_KEY_ENV[draft.provider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-stone-50 dark:bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">偏好设置 (Learning Settings)</h2>
              <p className="text-xs text-zinc-500">调整难度、场景与模型连接信息</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {configMismatch && serverConfig && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-700 dark:text-amber-400 text-xs"
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-bold">检测到当前偏好与服务端实际配置不一致</p>
                <p className="mt-1 opacity-80">
                  服务端实际值: provider=<span className="font-mono">{serverConfig.provider}</span>,
                  chatModel=<span className="font-mono">{serverConfig.chatModel}</span>,
                  analyzeModel=<span className="font-mono">{serverConfig.analyzeModel}</span>,
                  baseUrl=<span className="font-mono">{serverConfig.baseUrl}</span>。
                  保存下方表单可更新本地偏好,或修改服务端 <code>.env</code> 后重启服务。
                </p>
              </div>
              <button
                type="button"
                onClick={onDismissMismatch}
                className="text-[10px] underline font-bold cursor-pointer"
                aria-label="忽略配置不一致警告"
              >
                忽略
              </button>
            </div>
          )}

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                模型连接 (Model Connection)
              </h3>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
              <p className="text-[10.5px] text-zinc-500 leading-relaxed border-b border-zinc-100 dark:border-zinc-800 pb-3">
                Base URL 在服务端的 <code>.env.local</code> 中配置,修改后请重启服务。
                浏览器侧只能切换 Provider 与模型;无法编辑 API Key 与 Base URL。
                模型来自内置清单,新增模型需修改 <code>src/models.ts</code>。
              </p>

              {/* Provider radio group */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 w-24">
                  Provider
                </span>
                <div role="radiogroup" aria-label="选择 LLM 提供商" className="flex gap-2">
                  {PROVIDER_OPTIONS.map((id) => {
                    const isActive = draft.provider === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => setProvider(id)}
                        className={`px-3 py-1.5 text-xs rounded-lg border font-semibold transition cursor-pointer ${
                          isActive
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {PROVIDER_LABELS[id]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chat model */}
              <div className="flex items-center gap-3">
                <label
                  htmlFor="settings-chat-model"
                  className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 w-24"
                >
                  Chat Model
                </label>
                <select
                  id="settings-chat-model"
                  value={effectiveChatModel}
                  onChange={(e) => setDraft({ ...draft, chatModel: e.target.value })}
                  aria-label="Chat model"
                  className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:border-indigo-500 outline-none font-mono"
                >
                  {availableModels.length === 0 ? (
                    <option value={DEFAULT_CHAT_MODEL}>{DEFAULT_CHAT_MODEL}</option>
                  ) : (
                    availableModels.map((m) => (
                      <option key={`chat-${m.provider}-${m.id}`} value={m.id}>
                        {m.label}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Analyze model */}
              <div className="flex items-center gap-3">
                <label
                  htmlFor="settings-analyze-model"
                  className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 w-24"
                >
                  Analyze Model
                </label>
                <select
                  id="settings-analyze-model"
                  value={effectiveAnalyzeModel}
                  onChange={(e) => setDraft({ ...draft, analyzeModel: e.target.value })}
                  aria-label="Analyze model"
                  className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:border-indigo-500 outline-none font-mono"
                >
                  {availableModels.length === 0 ? (
                    <option value={DEFAULT_ANALYZE_MODEL}>{DEFAULT_ANALYZE_MODEL}</option>
                  ) : (
                    availableModels.map((m) => (
                      <option key={`analyze-${m.provider}-${m.id}`} value={m.id}>
                        {m.label}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <p className="text-[10.5px] text-zinc-500 leading-relaxed">
                API Key 不可在浏览器配置,需在服务端 <code>.env.local</code> 中设置{" "}
                <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded mx-0.5">
                  {apiKeyEnvName}
                </code>{" "}
                并重启服务。
              </p>
            </div>
          </section>

          <LevelSelector currentLevel={currentLevel} onLevelChange={onLevelChange} />
          <ScenarioCards
            activeScenarioId={activeScenario.id}
            onScenarioSelect={onScenarioSelect}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!draft.chatModel.trim() || !draft.analyzeModel.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition cursor-pointer shadow-sm text-sm disabled:bg-zinc-300 disabled:cursor-not-allowed dark:disabled:bg-zinc-700"
          >
            保存并开始练习
          </button>
        </div>
      </div>
    </div>
  );
}
