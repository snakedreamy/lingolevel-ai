import type { SpeechAccent } from '../../types'
import { apiTtsProvider } from './api'
import { browserTtsProvider } from './browser'
import { createFallbackTtsProvider } from './fallback'
import type { TtsLanguage } from './types'

export { TtsError } from './types'

export const ttsProvider = createFallbackTtsProvider(browserTtsProvider, apiTtsProvider)

export function resolveTtsLanguage(text: string, accent: SpeechAccent): TtsLanguage {
  const chineseCharacters = text.match(/[一-鿿]/g)?.length ?? 0
  const latinCharacters = text.match(/[A-Za-z]/g)?.length ?? 0
  if (chineseCharacters > latinCharacters) return 'zh-CN'
  return accent === 'us' ? 'en-US' : 'en-GB'
}
