import { useMemo, useState } from "react"
import type { WordItem } from "../../types"
import { loadStoredJson, removeStoredValue, saveStoredJson } from "../../lib/storage"

const WORDBOOK_KEY = "english_coach_wordbook"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringOrFallback(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function normalizeWordItem(value: unknown): WordItem | null {
  if (!isRecord(value)) return null

  const word = stringOrFallback(value.word).trim()
  if (!word) return null

  return {
    word,
    phonetic: stringOrFallback(value.phonetic),
    translation: stringOrFallback(value.translation),
    exampleEn: stringOrFallback(value.exampleEn),
    exampleZh: stringOrFallback(value.exampleZh),
    addTime: typeof value.addTime === "number" && Number.isFinite(value.addTime) ? value.addTime : 0,
  }
}

function normalizeWordList(value: unknown): WordItem[] {
  if (!Array.isArray(value)) return []
  return value.map(normalizeWordItem).filter((item): item is WordItem => item !== null)
}

function normalizeLookupWord(word: unknown): string {
  return typeof word === "string" ? word.trim().toLowerCase() : ""
}

function getInitialWords(): WordItem[] {
  return normalizeWordList(loadStoredJson<unknown>(WORDBOOK_KEY, []))
}

export function useWordBook() {
  const [savedWords, setSavedWords] = useState<WordItem[]>(getInitialWords)

  const hasWord = (word: string) => {
    const lookupWord = normalizeLookupWord(word)
    return lookupWord ? normalizeWordList(savedWords).some((item) => normalizeLookupWord(item.word) === lookupWord) : false
  }

  const removeWord = (word: string) => {
    const lookupWord = normalizeLookupWord(word)
    if (!lookupWord) return

    setSavedWords((prev) => {
      const next = normalizeWordList(prev).filter((item) => normalizeLookupWord(item.word) !== lookupWord)
      saveStoredJson(WORDBOOK_KEY, next)
      return next
    })
  }

  const addWord = (word: WordItem) => {
    const normalizedWord = normalizeWordItem(word)

    setSavedWords((prev) => {
      const prevWords = normalizeWordList(prev)
      if (!normalizedWord) {
        saveStoredJson(WORDBOOK_KEY, prevWords)
        return prevWords
      }

      const lookupWord = normalizeLookupWord(normalizedWord.word)
      const exists = prevWords.some((item) => normalizeLookupWord(item.word) === lookupWord)
      const next = exists ? prevWords.filter((item) => normalizeLookupWord(item.word) !== lookupWord) : [normalizedWord, ...prevWords]
      saveStoredJson(WORDBOOK_KEY, next)
      return next
    })
  }

  const clearAllWords = () => {
    setSavedWords([])
    removeStoredValue(WORDBOOK_KEY)
  }

  return {
    savedWords,
    addWord,
    removeWord,
    clearAllWords,
    hasWord,
    hasAnyWords: useMemo(() => savedWords.length > 0, [savedWords]),
  }
}
