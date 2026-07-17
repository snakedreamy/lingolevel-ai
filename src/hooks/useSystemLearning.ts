import { useCallback, useMemo, useState } from 'react'
import { LEARNING_CONCEPTS } from '../data/learningCurriculum'
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

function loadState(): StoredLearningState {
  const stored = loadStoredJson<StoredLearningState>(STORAGE_KEY, EMPTY_STATE)
  return stored?.version === 1 && stored.progress ? stored : EMPTY_STATE
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

  const update = useCallback((recipe: (current: StoredLearningState) => StoredLearningState) => {
    setState((current) => {
      const next = recipe(current)
      saveStoredJson(STORAGE_KEY, next)
      return next
    })
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
