import { useCallback, useEffect, useMemo, useState } from 'react'
import { LEARNING_CONCEPTS, LEARNING_ROUTES } from '../data/learningCurriculum'
import type { MasteryDimension } from '../data/learningLessons'
import { loadStoredJson, saveStoredJson } from '../lib/storage'

export type LearningStatus = 'not_started' | 'learning' | 'completed'

export interface ConceptLearningProgress {
  conceptId: string
  status: LearningStatus
  recognitionScore: number
  understandingScore: number
  constructionScore: number
  applicationScore: number
  attempts: number
  lastStudiedAt?: string
  nextReviewAt?: string
}

interface StoredLearningState {
  version: 1
  selectedRouteId: string
  progress: Record<string, ConceptLearningProgress>
}

const STORAGE_KEY = 'lingolevel_system_learning_v1'
const EMPTY_STATE: StoredLearningState = { version: 1, selectedRouteId: 'sentence-building', progress: {} }
const CONCEPT_IDS = new Set(LEARNING_CONCEPTS.map((concept) => concept.id))
const ROUTE_IDS = new Set(LEARNING_ROUTES.map((route) => route.id))
const LEARNING_STATUSES = new Set<LearningStatus>(['not_started', 'learning', 'completed'])

function score(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
}

function storedDate(value: unknown): string | undefined {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : undefined
}

function normalizeProgress(conceptId: string, value: unknown): ConceptLearningProgress {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return emptyProgress(conceptId)
  const item = value as Record<string, unknown>
  return {
    conceptId,
    status: typeof item.status === 'string' && LEARNING_STATUSES.has(item.status as LearningStatus)
      ? item.status as LearningStatus
      : 'not_started',
    recognitionScore: score(item.recognitionScore),
    understandingScore: score(item.understandingScore),
    constructionScore: score(item.constructionScore),
    applicationScore: score(item.applicationScore),
    attempts: typeof item.attempts === 'number' && Number.isSafeInteger(item.attempts) && item.attempts >= 0 ? item.attempts : 0,
    lastStudiedAt: storedDate(item.lastStudiedAt),
    nextReviewAt: storedDate(item.nextReviewAt),
  }
}

function loadState(): StoredLearningState {
  const stored = loadStoredJson<unknown>(STORAGE_KEY, null)
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return { ...EMPTY_STATE, progress: {} }
  const value = stored as Record<string, unknown>
  if (value.version !== 1) return { ...EMPTY_STATE, progress: {} }
  const progress: Record<string, ConceptLearningProgress> = {}
  if (typeof value.progress === 'object' && value.progress !== null && !Array.isArray(value.progress)) {
    for (const [conceptId, item] of Object.entries(value.progress)) {
      if (CONCEPT_IDS.has(conceptId)) progress[conceptId] = normalizeProgress(conceptId, item)
    }
  }
  return {
    version: 1,
    selectedRouteId: typeof value.selectedRouteId === 'string' && ROUTE_IDS.has(value.selectedRouteId)
      ? value.selectedRouteId
      : EMPTY_STATE.selectedRouteId,
    progress,
  }
}

function emptyProgress(conceptId: string): ConceptLearningProgress {
  return {
    conceptId,
    status: 'not_started',
    recognitionScore: 0,
    understandingScore: 0,
    constructionScore: 0,
    applicationScore: 0,
    attempts: 0,
  }
}

export function useSystemLearning() {
  const [state, setState] = useState<StoredLearningState>(loadState)

  useEffect(() => { saveStoredJson(STORAGE_KEY, state) }, [state])

  const update = useCallback((recipe: (current: StoredLearningState) => StoredLearningState) => {
    setState((current) => recipe(current))
  }, [])

  const setSelectedRouteId = useCallback((selectedRouteId: string) => {
    update((current) => ({ ...current, selectedRouteId }))
  }, [update])

  const startConcept = useCallback((conceptId: string) => {
    update((current) => {
      const existing = current.progress[conceptId] ?? emptyProgress(conceptId)
      return {
        ...current,
        progress: {
          ...current.progress,
          [conceptId]: { ...existing, status: existing.status === 'completed' ? 'completed' : 'learning', lastStudiedAt: new Date().toISOString() },
        },
      }
    })
  }, [update])

  const completeLesson = useCallback((conceptId: string, scores: Record<MasteryDimension, number>) => {
    update((current) => {
      const existing = current.progress[conceptId] ?? emptyProgress(conceptId)
      const average = (scores.recognition + scores.understanding + scores.construction + scores.application) / 4
      const minimum = Math.min(scores.recognition, scores.understanding, scores.construction, scores.application)
      const now = new Date()
      const reviewDelay = average >= 85 && minimum >= 70 ? 7 : average >= 70 && minimum >= 50 ? 3 : 1
      const nextReview = new Date(now)
      nextReview.setDate(nextReview.getDate() + reviewDelay)
      return {
        ...current,
        progress: {
          ...current.progress,
          [conceptId]: {
            ...existing,
            status: average >= 70 && minimum >= 50 ? 'completed' : 'learning',
            recognitionScore: Math.max(existing.recognitionScore, scores.recognition),
            understandingScore: Math.max(existing.understandingScore, scores.understanding),
            constructionScore: Math.max(existing.constructionScore, scores.construction),
            applicationScore: Math.max(existing.applicationScore, scores.application),
            attempts: existing.attempts + 1,
            lastStudiedAt: now.toISOString(),
            nextReviewAt: nextReview.toISOString(),
          },
        },
      }
    })
  }, [update])

  const dueReviews = useMemo(() => {
    const now = Date.now()
    return Object.values(state.progress)
      .filter((item) => item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= now)
      .sort((a, b) => (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? ''))
  }, [state.progress])

  const suggestedConceptId = useMemo(() => {
    const available = LEARNING_CONCEPTS.filter((concept) => concept.lessonId)
    return dueReviews[0]?.conceptId
      ?? available.find((concept) => state.progress[concept.id]?.status === 'learning')?.id
      ?? available.find((concept) => state.progress[concept.id]?.status !== 'completed')?.id
  }, [dueReviews, state.progress])

  return {
    selectedRouteId: state.selectedRouteId,
    progress: state.progress,
    dueReviews,
    suggestedConceptId,
    setSelectedRouteId,
    startConcept,
    completeLesson,
    getProgress: (conceptId: string) => state.progress[conceptId] ?? emptyProgress(conceptId),
  }
}
