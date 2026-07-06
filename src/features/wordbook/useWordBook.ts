import { useMemo, useState } from "react"
import type { WordItem } from "../../types"
import { loadStoredJson, removeStoredValue, saveStoredJson } from "../../lib/storage"

const WORDBOOK_KEY = "english_coach_wordbook"

type WordLookup = Record<string, true>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringOrFallback(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function normalizeLookupWord(word: unknown): string {
  return typeof word === "string" ? word.trim().toLowerCase() : ""
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
    addTime: typeof value.addTime === "number" && Number.isFinite(value.addTime) ? value.addTime : Date.now(),
  }
}

function normalizeWordList(value: unknown): WordItem[] {
  if (!Array.isArray(value)) return []

  const words = value.map(normalizeWordItem).filter((item): item is WordItem => item !== null)
  const seen = new Set<string>()
  const uniqueWords: WordItem[] = []

  for (const item of words) {
    const lookupWord = normalizeLookupWord(item.word)
    if (!lookupWord || seen.has(lookupWord)) continue
    seen.add(lookupWord)
    uniqueWords.push(item)
  }

  return uniqueWords
}

function getInitialWords(): WordItem[] {
  return normalizeWordList(loadStoredJson<unknown>(WORDBOOK_KEY, []))
}

function buildWordLookup(words: WordItem[]): WordLookup {
  return words.reduce<WordLookup>((lookup, item) => {
    const key = normalizeLookupWord(item.word)
    if (key) lookup[key] = true
    return lookup
  }, {})
}

export function useWordBook() {
  const [savedWords, setSavedWords] = useState<WordItem[]>(getInitialWords)

  const wordLookup = useMemo(() => buildWordLookup(savedWords), [savedWords])

  const hasWord = (word: string) => {
    const lookupWord = normalizeLookupWord(word)
    return lookupWord ? wordLookup[lookupWord] === true : false
  }

  const removeWord = (word: string) => {
    const lookupWord = normalizeLookupWord(word)
    if (!lookupWord) return

    setSavedWords((prev) => {
      const next = prev.filter((item) => normalizeLookupWord(item.word) !== lookupWord)
      saveStoredJson(WORDBOOK_KEY, next)
      return next
    })
  }

  const addWord = (word: WordItem) => {
    const normalizedWord = normalizeWordItem(word)
    if (!normalizedWord) return false

    const lookupWord = normalizeLookupWord(normalizedWord.word)
    if (!lookupWord) return false

    let added = false

    setSavedWords((prev) => {
      const exists = prev.some((item) => normalizeLookupWord(item.word) === lookupWord)
      if (exists) {
        saveStoredJson(WORDBOOK_KEY, prev)
        return prev
      }

      added = true
      const next = [normalizedWord, ...prev]
      saveStoredJson(WORDBOOK_KEY, next)
      return next
    })

    return added
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
    hasAnyWords: savedWords.length > 0,
  }
}
