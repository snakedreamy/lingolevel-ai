import assert from 'node:assert/strict'
import { DIFFICULTY_LEVELS } from '../src/types'
import { fallbackFillBlankCards, selectUniqueCards } from './fillBlank'

for (const level of DIFFICULTY_LEVELS) {
  for (const focus of ['vocabulary', 'grammar'] as const) {
    const fallback = fallbackFillBlankCards(level, focus, 0)
    assert.ok(fallback.length > 0, `${level}/${focus} should have fallback cards`)
    assert.ok(fallback.every((card) => card.focusType === focus), `${level}/${focus} mixed another focus type`)

    const selected = selectUniqueCards({ generated: [], fallback, count: 20, recentSentences: [] })
    assert.ok(selected.every((card) => card.focusType === focus), `${level}/${focus} selection mixed another focus type`)
  }
}

const vocabulary = fallbackFillBlankCards('kindergarten', 'vocabulary', 0)
const tenVocabulary = selectUniqueCards({ generated: [], fallback: vocabulary, count: 10, recentSentences: [] })
assert.equal(tenVocabulary.length, 10)
assert.ok(tenVocabulary.every((card) => card.focusType === 'vocabulary'))

const seenVocabulary = vocabulary.map((card) => card.sentence.replace('{{blank}}', card.answer))
const repeated = selectUniqueCards({ generated: [], fallback: vocabulary, count: 3, recentSentences: seenVocabulary })
assert.equal(repeated.length, 3)
assert.ok(repeated.every((card) => card.focusType === 'vocabulary'))

console.log('Fill-blank focus self-test OK')
