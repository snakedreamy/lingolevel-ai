import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { generateFillBlank } from '../lib/api'
import { loadStoredJson, saveStoredJson } from '../lib/storage'
import { FILL_BLANK_MAX_COUNT, FILL_BLANK_MIN_COUNT } from '../types'
import type { DifficultyLevel, FillBlankCard, FillBlankFocus, FillBlankProgress, Scenario } from '../types'

const HISTORY_KEY = 'lingolevel_fill_blank_history'
const MAX_HISTORY = 100

type PracticePhase = 'setup' | 'loading' | 'active' | 'complete'

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/[’]/g, "'").replace(/[.!?,;:]+$/g, '')
}

function loadHistory(): string[] {
  const value = loadStoredJson<unknown>(HISTORY_KEY, [])
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(-MAX_HISTORY)
    : []
}

export function useFillBlankPractice(args: { level: DifficultyLevel; scenario: Scenario }) {
  const { level, scenario } = args
  const [phase, setPhase] = useState<PracticePhase>('setup')
  const [count, setCountState] = useState(5)
  const [focus, setFocus] = useState<FillBlankFocus>('mixed')
  const [cards, setCards] = useState<FillBlankCard[]>([])
  const [progress, setProgress] = useState<Record<string, FillBlankProgress>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const setCount = useCallback((next: number) => {
    setCountState(Math.min(FILL_BLANK_MAX_COUNT, Math.max(FILL_BLANK_MIN_COUNT, Math.round(next || FILL_BLANK_MIN_COUNT))))
  }, [])

  const start = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setPhase('loading')
    setError(null)
    try {
      const history = loadHistory()
      const result = await generateFillBlank({
        count,
        level,
        focus,
        scenario: {
          name: scenario.name,
          englishName: scenario.englishName,
          description: scenario.description,
        },
        recentSentences: history,
      }, controller.signal)
      if (result.cards.length !== count) throw new Error('CARD_COUNT_MISMATCH')
      const initialProgress = Object.fromEntries(result.cards.map((card) => [card.id, {
        input: '', attempts: 0, status: 'answering' as const,
      }]))
      setCards(result.cards)
      setProgress(initialProgress)
      setCurrentIndex(0)
      setIsFallback(!!result.isFallback)
      setPhase('active')
      saveStoredJson(HISTORY_KEY, [
        ...history,
        ...result.cards.map((card) => card.sentence.replace('{{blank}}', card.answer)),
      ].slice(-MAX_HISTORY))
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error && err.message === 'CARD_COUNT_MISMATCH'
        ? '生成的题目数量不完整，请重新生成。'
        : '暂时无法生成练习，请检查网络或稍后重试。')
      setPhase('setup')
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [count, focus, level, scenario])

  const currentCard = cards[currentIndex] ?? null
  const currentProgress = currentCard ? progress[currentCard.id] : undefined

  const updateInput = useCallback((input: string) => {
    if (!currentCard || currentProgress?.status !== 'answering') return
    setProgress((value) => ({
      ...value,
      [currentCard.id]: { ...(value[currentCard.id] ?? { attempts: 0, status: 'answering' }), input },
    }))
  }, [currentCard, currentProgress?.status])

  const submit = useCallback((): boolean | null => {
    if (!currentCard || !currentProgress || currentProgress.status !== 'answering' || !currentProgress.input.trim()) return null
    const correct = normalizeAnswer(currentProgress.input) === normalizeAnswer(currentCard.answer)
    setProgress((value) => ({
      ...value,
      [currentCard.id]: {
        ...value[currentCard.id],
        attempts: value[currentCard.id].attempts + (correct ? 0 : 1),
        status: correct ? 'correct' : 'answering',
      },
    }))
    return correct
  }, [currentCard, currentProgress])

  const reveal = useCallback(() => {
    if (!currentCard || !currentProgress || currentProgress.status !== 'answering') return
    setProgress((value) => ({
      ...value,
      [currentCard.id]: { ...value[currentCard.id], status: 'revealed' },
    }))
  }, [currentCard, currentProgress])

  const next = useCallback(() => {
    if (!currentProgress || currentProgress.status === 'answering') return
    if (currentIndex >= cards.length - 1) setPhase('complete')
    else setCurrentIndex((index) => index + 1)
  }, [cards.length, currentIndex, currentProgress])

  const resetToSetup = useCallback(() => {
    controllerRef.current?.abort()
    setCards([])
    setProgress({})
    setCurrentIndex(0)
    setError(null)
    setPhase('setup')
  }, [])

  const stats = useMemo(() => {
    const values = cards.map((card) => progress[card.id]).filter(Boolean)
    const firstTry = values.filter((item) => item.status === 'correct' && item.attempts === 0).length
    const corrected = values.filter((item) => item.status === 'correct' && item.attempts > 0).length
    const revealed = values.filter((item) => item.status === 'revealed').length
    return { firstTry, corrected, revealed, total: cards.length }
  }, [cards, progress])

  return {
    phase, count, setCount, focus, setFocus, cards, progress, currentCard, currentProgress,
    currentIndex, error, isFallback, stats, start, updateInput, submit, reveal, next, resetToSetup,
  }
}
