export type TtsLanguage = 'zh-CN' | 'en-US' | 'en-GB'

export interface TtsSpeakInput {
  text: string
  language: TtsLanguage
  speed: number
  signal: AbortSignal
}

export type TtsErrorCode =
  | 'canceled'
  | 'unavailable'
  | 'blocked'
  | 'playback-failed'
  | 'service-unavailable'

export class TtsError extends Error {
  constructor(
    public readonly code: TtsErrorCode,
    public readonly fallbackAllowed = false,
  ) {
    super(code)
    this.name = 'TtsError'
  }
}

export interface TtsProvider {
  readonly id: string
  isAvailable(): boolean
  speak(input: TtsSpeakInput): Promise<void>
}
