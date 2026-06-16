// src/models.ts
// 写死的模型清单(中转站仅支持 deepseek-v4-flash,故只放这一个;未来扩展在此追加)

import type { ProviderId } from './types'

export interface ModelOption {
  id: string                 // 实际发给上游的 model 字段
  label: string              // UI 显示名
  provider: ProviderId
  description?: string
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'deepseek-v4-flash',
    label: 'DeepSeek v4 Flash (中转推荐)',
    provider: 'openai',
    description: '当前中转唯一支持的模型,速度快、成本低'
  },
  {
    id: 'deepseek-v4-flash',
    label: 'DeepSeek v4 Flash (Anthropic 协议)',
    provider: 'anthropic',
    description: '同一模型走 Anthropic 协议,用于对比测试'
  }
]

export const DEFAULT_CHAT_MODEL = 'deepseek-v4-flash'
export const DEFAULT_ANALYZE_MODEL = 'deepseek-v4-flash'
