import type { ProviderId } from './types'

export interface ModelOption {
  id: string
  label: string
  provider: ProviderId
  description?: string
}

// The active provider and model names are intentionally server-owned.
// Keep this empty compatibility export for older imports or future optional UI
// suggestions, but do not treat it as the source of runtime model defaults.
export const AVAILABLE_MODELS: ModelOption[] = []

export const DEFAULT_CHAT_MODEL = ''
export const DEFAULT_ANALYZE_MODEL = ''
