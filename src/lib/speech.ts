// src/lib/speech.ts — moved from features/chat/speech.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SpeechAccent } from '../types'

export interface SpeechNotice {
  kind: 'info' | 'error'
  message: string
}

export interface SpeechPlayer {
  accent: SpeechAccent
  speed: number
  activeId: string | null
  notice: SpeechNotice | null
  setAccent: (accent: SpeechAccent) => void
  setSpeed: (speed: number) => void
  toggle: (id: string, text: string, label?: string) => void
  stop: () => void
  clearNotice: () => void
}

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
  text: string
  accent: SpeechAccent
  speed: number
  onStart(): void
  onEnd(): void
  onError(error: string): void
}): void {
  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
    throw new Error('SPEECH_SYNTHESIS_UNAVAILABLE')
  }
  const { text, accent, speed, onStart, onEnd, onError } = args
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const chineseCharacters = text.match(/[一-鿿]/g)?.length ?? 0
  const latinCharacters = text.match(/[A-Za-z]/g)?.length ?? 0
  utterance.lang = chineseCharacters > latinCharacters ? 'zh-CN' : accent === 'us' ? 'en-US' : 'en-GB'
  const targetLanguage = utterance.lang.toLowerCase()
  utterance.voice = window.speechSynthesis.getVoices().find((voice) =>
    voice.lang.toLowerCase() === targetLanguage,
  ) ?? null
  utterance.rate = speed
  utterance.onstart = onStart
  utterance.onend = onEnd
  utterance.onerror = (event) => onError(event.error)
  window.speechSynthesis.speak(utterance)
}

function speechErrorMessage(error: string): string {
  if (error === 'not-allowed') return '浏览器阻止了语音播放，请与页面交互后重试。'
  if (error === 'language-unavailable' || error === 'voice-unavailable') {
    return '未找到对应语音，请检查系统的英语语音设置。'
  }
  return '朗读失败，请稍后重试。'
}

export function useSpeechPlayer({ accent, speed, setAccent, setSpeed }: {
  accent: SpeechAccent
  speed: number
  setAccent: (accent: SpeechAccent) => void
  setSpeed: (speed: number) => void
}): SpeechPlayer {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [notice, setNotice] = useState<SpeechNotice | null>(null)
  const requestRef = useRef(0)
  const noticeTimerRef = useRef<number | null>(null)

  const showNotice = useCallback((next: SpeechNotice, duration = 2200) => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    setNotice(next)
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), duration)
  }, [])

  const clearNotice = useCallback(() => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = null
    setNotice(null)
  }, [])

  const stop = useCallback(() => {
    if (!activeId) return
    requestRef.current += 1
    window.speechSynthesis?.cancel()
    setActiveId(null)
    showNotice({ kind: 'info', message: '已停止朗读。' }, 1200)
  }, [activeId, showNotice])

  const toggle = useCallback((id: string, text: string, label = '内容') => {
    const requestId = ++requestRef.current
    if (activeId === id) {
      stop()
      return
    }

    try {
      setActiveId(id)
      showNotice({ kind: 'info', message: `正在朗读${label ? `：${label}` : ''}，再次点击可停止。` })
      speakText({
        text,
        accent,
        speed,
        onStart: () => undefined,
        onEnd: () => {
          if (requestRef.current !== requestId) return
          setActiveId(null)
          showNotice({ kind: 'info', message: '朗读结束。' }, 1200)
        },
        onError: (error) => {
          if (requestRef.current !== requestId || error === 'canceled' || error === 'interrupted') return
          setActiveId(null)
          showNotice({ kind: 'error', message: speechErrorMessage(error) }, 3200)
        },
      })
    } catch (error) {
      setActiveId(null)
      showNotice({
        kind: 'error',
        message: error instanceof Error && error.message === 'SPEECH_SYNTHESIS_UNAVAILABLE'
          ? '当前浏览器不支持语音朗读，请更换浏览器后重试。'
          : '朗读失败，请稍后重试。',
      }, 3200)
    }
  }, [accent, activeId, showNotice, speed, stop])

  useEffect(() => () => {
    requestRef.current += 1
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  return { accent, speed, activeId, notice, setAccent, setSpeed, toggle, stop, clearNotice }
}
