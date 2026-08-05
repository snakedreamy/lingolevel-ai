import assert from 'node:assert/strict'
import { loadFillBlankSession } from './useFillBlankPractice'

const card = {
  id: 'card-1',
  sentence: 'I {{blank}} every day.',
  translation: '我每天练习。',
  answer: 'practice',
  phonetic: '/ˈpræktɪs/',
  partOfSpeech: '动词',
  definition: '练习',
  hint: '动作',
  grammarPoint: '一般现在时',
  structure: '主语 + 动词 + 时间',
  explanation: '表达习惯。',
  focusType: 'vocabulary' as const,
  breakdown: [
    { text: 'I', role: '主语', explanation: '动作执行者。' },
    { text: 'practice', role: '谓语', explanation: '习惯动作。' },
    { text: 'every day', role: '时间', explanation: '表示频率。' },
  ],
  imitation: {
    steps: ['保留结构。', '替换动作。'],
    example: 'I read every day.',
    translation: '我每天阅读。',
    caution: '注意动词形式。',
  },
}

let stored: unknown
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: {
      getItem: () => JSON.stringify(stored),
    },
  },
})

stored = {
  version: 1,
  phase: 'active',
  level: 'primary_low',
  count: 3,
  focus: 'grammar',
  cards: [card, { ...card, id: 'card-2' }, { ...card, id: 'card-3' }],
  progress: {
    'card-1': { input: '', attempts: 0, status: 'answering' },
    'card-2': { input: '', attempts: 0, status: 'answering' },
    'card-3': { input: '', attempts: 0, status: 'answering' },
  },
  currentIndex: 0,
  isFallback: true,
  fallbackCount: 3,
}
const rejected = loadFillBlankSession('primary_low')
assert.equal(rejected.phase, 'setup')
assert.equal(rejected.focus, 'grammar')
assert.deepEqual(rejected.cards, [])

stored = { ...(stored as object), focus: 'vocabulary' }
const accepted = loadFillBlankSession('primary_low')
assert.equal(accepted.phase, 'active')
assert.equal(accepted.cards.length, 3)
assert.ok(accepted.cards.every((item) => item.focusType === 'vocabulary'))

console.log('Fill-blank stored session self-test OK')
