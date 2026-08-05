// src/lib/speech.ts — moved from features/chat/speech.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SpeechAccent } from '../types'
import { resolveTtsLanguage, TtsError, ttsProvider } from './tts'

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

function speechErrorMessage(error: unknown): string {
  if (error instanceof TtsError) {
    if (error.code === 'blocked') return '浏览器阻止了语音播放，请与页面交互后重试。'
    if (error.code === 'service-unavailable') return '云端语音服务暂时不可用，请稍后重试。'
    if (error.code === 'unavailable') return '当前设备无法播放语音。'
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
  const playbackRef = useRef<AbortController | null>(null)
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
    playbackRef.current?.abort()
    playbackRef.current = null
    setActiveId(null)
    showNotice({ kind: 'info', message: '已停止朗读。' }, 1200)
  }, [activeId, showNotice])

  const toggle = useCallback((id: string, text: string, label = '内容') => {
    if (activeId === id) {
      stop()
      return
    }

    const requestId = ++requestRef.current
    playbackRef.current?.abort()
    const controller = new AbortController()
    playbackRef.current = controller
    setActiveId(id)
    showNotice({ kind: 'info', message: `正在朗读${label ? `：${label}` : ''}，再次点击可停止。` })

    void ttsProvider.speak({
      text,
      language: resolveTtsLanguage(text, accent),
      speed,
      signal: controller.signal,
    }).then(() => {
      if (requestRef.current !== requestId) return
      playbackRef.current = null
      setActiveId(null)
      showNotice({ kind: 'info', message: '朗读结束。' }, 1200)
    }).catch((error: unknown) => {
      if (requestRef.current !== requestId || controller.signal.aborted) return
      playbackRef.current = null
      setActiveId(null)
      showNotice({ kind: 'error', message: speechErrorMessage(error) }, 3200)
    })
  }, [accent, activeId, showNotice, speed, stop])

  useEffect(() => () => {
    requestRef.current += 1
    playbackRef.current?.abort()
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
  }, [])

  return { accent, speed, activeId, notice, setAccent, setSpeed, toggle, stop, clearNotice }
}
