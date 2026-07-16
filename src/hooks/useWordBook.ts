// src/hooks/useWordBook.ts — moved from features/wordbook/
import { useMemo, useState } from 'react'
import type { WordItem } from '../types'
import { loadStoredJson, removeStoredValue, saveStoredJson } from '../lib/storage'

const WORDBOOK_KEY = 'english_coach_wordbook'

function normalizeLookupWord(word: unknown): string {
  return typeof word === 'string' ? word.trim().toLowerCase() : ''
}

function normalizeWordItem(value: unknown): WordItem | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  const word = (typeof v.word === 'string' ? v.word : '').trim()
  if (!word) return null
  const str = (k: string) => typeof v[k] === 'string' ? (v[k] as string) : ''
  return {
    word,
    phonetic: str('phonetic'),
    translation: str('translation'),
    exampleEn: str('exampleEn'),
    exampleZh: str('exampleZh'),
    addTime: typeof v.addTime === 'number' && Number.isFinite(v.addTime) ? v.addTime : Date.now(),
  }
}

function normalizeWordList(value: unknown): WordItem[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: WordItem[] = []
  for (const raw of value) {
    const item = normalizeWordItem(raw)
    if (!item) continue
    const key = normalizeLookupWord(item.word)
    if (key && !seen.has(key)) { seen.add(key); result.push(item) }
  }
  return result
}

export function useWordBook() {
  const [savedWords, setSavedWords] = useState<WordItem[]>(() =>
    normalizeWordList(loadStoredJson<unknown>(WORDBOOK_KEY, [])))

  const wordLookup = useMemo(() =>
    savedWords.reduce<Record<string, true>>((acc, item) => {
      const key = normalizeLookupWord(item.word)
      if (key) acc[key] = true
      return acc
    }, {}), [savedWords])

  const hasWord = (word: string) => {
    const key = normalizeLookupWord(word)
    return key ? wordLookup[key] === true : false
  }

  const addWord = (word: WordItem): void => {
    const item = normalizeWordItem(word)
    if (!item) return
    const key = normalizeLookupWord(item.word)
    if (!key) return
    setSavedWords((prev) => {
      if (prev.some((w) => normalizeLookupWord(w.word) === key)) return prev
      const next = [item, ...prev]
      saveStoredJson(WORDBOOK_KEY, next)
      return next
    })
  }

  const removeWord = (word: string) => {
    const key = normalizeLookupWord(word)
    if (!key) return
    setSavedWords((prev) => {
      const next = prev.filter((w) => normalizeLookupWord(w.word) !== key)
      saveStoredJson(WORDBOOK_KEY, next)
      return next
    })
  }

  const clearAllWords = () => { setSavedWords([]); removeStoredValue(WORDBOOK_KEY) }

  return { savedWords, addWord, removeWord, clearAllWords, hasWord }
}
