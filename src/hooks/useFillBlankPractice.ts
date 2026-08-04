import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { generateFillBlank } from '../lib/api'
import { incrementStoredCounter, isStoredRecord, loadStoredJson, saveStoredJson } from '../lib/storage'
import { FILL_BLANK_MAX_COUNT, FILL_BLANK_MIN_COUNT } from '../types'
import type { DifficultyLevel, FillBlankCard, FillBlankFocus, FillBlankProgress, ThinkingEffort } from '../types'

const HISTORY_KEY = 'lingolevel_fill_blank_history'
const VARIETY_KEY = 'lingolevel_fill_blank_variety'
const SESSION_KEY = 'lingolevel_fill_blank_session_v1'
const MAX_HISTORY = 100

type PracticePhase = 'setup' | 'loading' | 'active' | 'complete'
type StoredPracticePhase = Exclude<PracticePhase, 'loading'>

interface StoredFillBlankSession {
  version: 1
  phase: StoredPracticePhase
  level: DifficultyLevel
  count: number
  focus: FillBlankFocus
  cards: FillBlankCard[]
  progress: Record<string, FillBlankProgress>
  currentIndex: number
  isFallback: boolean
  fallbackCount: number
}

const LEVEL_IDS = new Set<DifficultyLevel>(['kindergarten', 'primary_low', 'primary_high', 'junior', 'senior', 'college', 'ielts'])
const FOCUS_IDS = new Set<FillBlankFocus>(['mixed', 'vocabulary', 'grammar'])
const PROGRESS_STATUSES = new Set<FillBlankProgress['status']>(['answering', 'correct', 'revealed'])

function storedText(value: unknown): value is string {
  return typeof value === 'string'
}

function storedCard(value: unknown): value is FillBlankCard {
  if (!isStoredRecord(value)) return false
  const requiredText = [
    'id', 'sentence', 'translation', 'answer', 'phonetic', 'partOfSpeech',
    'definition', 'hint', 'grammarPoint', 'structure', 'explanation',
  ] as const
  if (!requiredText.every((key) => storedText(value[key])) || !storedText(value.sentence)
    || !value.sentence.includes('{{blank}}')
    || (value.focusType !== 'vocabulary' && value.focusType !== 'grammar')
    || !Array.isArray(value.breakdown) || !isStoredRecord(value.imitation)) return false
  return value.breakdown.every((item) => isStoredRecord(item)
      && storedText(item.text) && storedText(item.role) && storedText(item.explanation))
    && Array.isArray(value.imitation.steps) && value.imitation.steps.every(storedText)
    && storedText(value.imitation.example) && storedText(value.imitation.translation)
    && storedText(value.imitation.caution)
}

function storedProgress(value: unknown): FillBlankProgress | null {
  if (!isStoredRecord(value) || !storedText(value.input)
    || typeof value.attempts !== 'number' || !Number.isSafeInteger(value.attempts) || value.attempts < 0
    || !storedText(value.status) || !PROGRESS_STATUSES.has(value.status as FillBlankProgress['status'])) return null
  return { input: value.input, attempts: value.attempts, status: value.status as FillBlankProgress['status'] }
}

function loadSession(defaultLevel: DifficultyLevel): StoredFillBlankSession {
  const empty: StoredFillBlankSession = {
    version: 1,
    phase: 'setup',
    level: defaultLevel,
    count: 5,
    focus: 'mixed',
    cards: [],
    progress: {},
    currentIndex: 0,
    isFallback: false,
    fallbackCount: 0,
  }
  const value = loadStoredJson<unknown>(SESSION_KEY, null)
  if (!isStoredRecord(value) || value.version !== 1) return empty
  const count = typeof value.count === 'number' && Number.isFinite(value.count)
    ? Math.min(FILL_BLANK_MAX_COUNT, Math.max(FILL_BLANK_MIN_COUNT, Math.round(value.count)))
    : empty.count
  const level = storedText(value.level) && LEVEL_IDS.has(value.level as DifficultyLevel)
    ? value.level as DifficultyLevel
    : defaultLevel
  const focus = storedText(value.focus) && FOCUS_IDS.has(value.focus as FillBlankFocus)
    ? value.focus as FillBlankFocus
    : empty.focus
  if (!Array.isArray(value.cards) || !value.cards.every(storedCard) || !isStoredRecord(value.progress)) {
    return { ...empty, level, count, focus }
  }
  const cards = value.cards as FillBlankCard[]
  if (cards.length < FILL_BLANK_MIN_COUNT || cards.length > FILL_BLANK_MAX_COUNT
    || new Set(cards.map((card) => card.id)).size !== cards.length) {
    return { ...empty, level, count, focus }
  }
  const progress: Record<string, FillBlankProgress> = {}
  for (const card of cards) {
    const item = storedProgress(value.progress[card.id])
    if (!item) return { ...empty, level, count, focus }
    progress[card.id] = item
  }
  const firstAnsweringIndex = cards.findIndex((card) => progress[card.id].status === 'answering')
  const allSettled = firstAnsweringIndex < 0
  const requestedIndex = typeof value.currentIndex === 'number' && Number.isSafeInteger(value.currentIndex)
    ? value.currentIndex
    : 0
  const maxReachableIndex = allSettled ? cards.length - 1 : firstAnsweringIndex
  return {
    version: 1,
    phase: value.phase === 'complete' && allSettled ? 'complete' : 'active',
    level,
    count: cards.length,
    focus,
    cards,
    progress,
    currentIndex: Math.min(Math.max(0, requestedIndex), maxReachableIndex),
    isFallback: value.isFallback === true,
    fallbackCount: typeof value.fallbackCount === 'number' && Number.isSafeInteger(value.fallbackCount) && value.fallbackCount >= 0
      ? value.fallbackCount
      : 0,
  }
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/[’]/g, "'").replace(/[.!?,;:]+$/g, '')
}

function loadHistory(): string[] {
  const value = loadStoredJson<unknown>(HISTORY_KEY, [])
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(-MAX_HISTORY)
    : []
}

export function useFillBlankPractice(args: { level: DifficultyLevel; modelId: string; thinkingEffort: ThinkingEffort }) {
  const { level, modelId, thinkingEffort } = args
  const [initialSession] = useState(() => loadSession(level))
  const [phase, setPhase] = useState<PracticePhase>(initialSession.phase)
  const [practiceLevel, setPracticeLevel] = useState<DifficultyLevel>(initialSession.level)
  const [count, setCountState] = useState(initialSession.count)
  const [focus, setFocus] = useState<FillBlankFocus>(initialSession.focus)
  const [cards, setCards] = useState<FillBlankCard[]>(initialSession.cards)
  const [progress, setProgress] = useState<Record<string, FillBlankProgress>>(initialSession.progress)
  const [currentIndex, setCurrentIndex] = useState(initialSession.currentIndex)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(initialSession.isFallback)
  const [fallbackCount, setFallbackCount] = useState(initialSession.fallbackCount)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])
  useEffect(() => {
    if (phase === 'loading') return
    saveStoredJson<StoredFillBlankSession>(SESSION_KEY, {
      version: 1,
      phase,
      level: phase === 'setup' ? level : practiceLevel,
      count,
      focus,
      cards,
      progress,
      currentIndex,
      isFallback,
      fallbackCount,
    })
  }, [cards, count, currentIndex, fallbackCount, focus, isFallback, level, phase, practiceLevel, progress])

  const setCount = useCallback((next: number) => {
    setCountState(Math.min(FILL_BLANK_MAX_COUNT, Math.max(FILL_BLANK_MIN_COUNT, Math.round(next || FILL_BLANK_MIN_COUNT))))
  }, [])

  const start = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setPhase('loading')
    setError(null)
    setIsFallback(false)
    setFallbackCount(0)
    try {
      const history = loadHistory()
      const result = await generateFillBlank({
        count,
        level,
        focus,
        recentSentences: history,
        model: modelId || undefined,
        thinkingEffort: thinkingEffort || undefined,
        diversitySeed: incrementStoredCounter(VARIETY_KEY),
      }, controller.signal)
      if (result.cards.length !== count) throw new Error('CARD_COUNT_MISMATCH')
      const initialProgress = Object.fromEntries(result.cards.map((card) => [card.id, {
        input: '', attempts: 0, status: 'answering' as const,
      }]))
      setCards(result.cards)
      setProgress(initialProgress)
      setCurrentIndex(0)
      setPracticeLevel(level)
      setIsFallback(!!result.isFallback)
      setFallbackCount(Math.max(0, Number(result.fallbackCount) || 0))
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
  }, [count, focus, level, modelId, thinkingEffort])

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

  const goTo = useCallback((index: number) => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= cards.length) return
    const firstAnsweringIndex = cards.findIndex((card) => progress[card.id]?.status === 'answering')
    const maxReachableIndex = firstAnsweringIndex < 0 ? cards.length - 1 : firstAnsweringIndex
    if (index > maxReachableIndex) return
    setCurrentIndex(index)
    setPhase('active')
  }, [cards, progress])

  const resetToSetup = useCallback(() => {
    controllerRef.current?.abort()
    setCards([])
    setProgress({})
    setCurrentIndex(0)
    setError(null)
    setIsFallback(false)
    setFallbackCount(0)
    setPracticeLevel(level)
    setPhase('setup')
  }, [level])

  const stats = useMemo(() => {
    const values = cards.map((card) => progress[card.id]).filter(Boolean)
    const firstTry = values.filter((item) => item.status === 'correct' && item.attempts === 0).length
    const corrected = values.filter((item) => item.status === 'correct' && item.attempts > 0).length
    const revealed = values.filter((item) => item.status === 'revealed').length
    return { firstTry, corrected, revealed, total: cards.length }
  }, [cards, progress])

  return {
    phase, count, setCount, focus, setFocus, cards, progress, currentCard, currentProgress,
    currentIndex, practiceLevel, error, isFallback, fallbackCount, stats,
    start, updateInput, submit, reveal, next, goTo, resetToSetup,
  }
}
