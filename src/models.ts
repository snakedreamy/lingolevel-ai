// src/models.ts
// Available model options for each provider.
// Add or remove entries based on what your upstream proxy / API key supports.

import type { ProviderId } from './types'

export interface ModelOption {
  id: string                 // actual model identifier sent to the upstream API
  label: string              // display name shown in the UI
  provider: ProviderId
  description?: string
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // ---- OpenAI-compatible (provider: openai) ----
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    description: 'OpenAI 官方轻量模型,速度快、成本低'
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    description: 'OpenAI 旗舰模型,综合能力强'
  },
  // ---- Anthropic (provider: anthropic) ----
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    description: 'Anthropic 主力模型,性能与速度均衡'
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    description: 'Anthropic 轻量模型,快速响应'
  }
]

export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini'
export const DEFAULT_ANALYZE_MODEL = 'gpt-4o-mini'
