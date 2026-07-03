import { useMemo, useState } from "react"
import type { WordItem } from "../../types"
import { loadStoredJson, removeStoredValue, saveStoredJson } from "../../lib/storage"

const WORDBOOK_KEY = "english_coach_wordbook"

function getInitialWords(): WordItem[] {
  return loadStoredJson<WordItem[]>(WORDBOOK_KEY, [])
}

export function useWordBook() {
  const [savedWords, setSavedWords] = useState<WordItem[]>(getInitialWords)

  const hasWord = (word: string) =>
    savedWords.some((item) => item.word.toLowerCase() === word.toLowerCase())

  const removeWord = (word: string) => {
    setSavedWords((prev) => {
      const next = prev.filter((item) => item.word.toLowerCase() !== word.toLowerCase())
      saveStoredJson(WORDBOOK_KEY, next)
      return next
    })
  }

  const addWord = (word: WordItem) => {
    setSavedWords((prev) => {
      const exists = prev.some((item) => item.word.toLowerCase() === word.word.toLowerCase())
      const next = exists ? prev.filter((item) => item.word.toLowerCase() !== word.word.toLowerCase()) : [word, ...prev]
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
