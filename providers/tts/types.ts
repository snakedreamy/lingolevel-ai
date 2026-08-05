export type TtsLanguage = 'zh-CN' | 'en-US' | 'en-GB'

export interface TtsSynthesisInput {
  text: string
  language: TtsLanguage
  speed: number
  signal?: AbortSignal
}

export interface TtsSynthesisOutput {
  audio: Buffer
  contentType: 'audio/wav' | 'audio/mpeg'
}

export interface TtsProvider {
  readonly id: string
  synthesize(input: TtsSynthesisInput): Promise<TtsSynthesisOutput>
}
