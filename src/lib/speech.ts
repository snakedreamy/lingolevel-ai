// src/lib/speech.ts — moved from features/chat/speech.ts
import type { Dispatch, SetStateAction } from 'react'

export type SpeechAccent = 'us' | 'uk'

interface SpeechRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript?: string }>>
}

interface SpeechRecognitionErrorResultEvent {
  error: string
}

export interface SpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorResultEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type SpeechRecognitionConstructor = new () => SpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export function createSpeechRecognition(
  setInputText: Dispatch<SetStateAction<string>>,
  setIsRecording: (value: boolean) => void,
  setRecognitionError: (value: string | null) => void,
): SpeechRecognition | null {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'
  recognition.onstart = () => { setIsRecording(true); setRecognitionError(null) }
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim()
    if (transcript) setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript))
  }
  recognition.onerror = (event) => {
    setRecognitionError(event.error === 'not-allowed'
      ? '麦克风权限被拒绝，请在浏览器地址栏开启麦克风。'
      : '未能识别您的声音，请重试或打字输入。')
    setIsRecording(false)
  }
  recognition.onend = () => setIsRecording(false)
  return recognition
}

export function speakText(args: {
  text: string; accent: SpeechAccent; speed: number; onStart(): void; onEnd(): void
}): void {
  if (!('speechSynthesis' in window)) throw new Error('SPEECH_SYNTHESIS_UNAVAILABLE')
  const { text, accent, speed, onStart, onEnd } = args
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = accent === 'us' ? 'en-US' : 'en-GB'
  utterance.rate = speed
  utterance.onstart = onStart
  utterance.onend = onEnd
  utterance.onerror = onEnd
  window.speechSynthesis.speak(utterance)
}
