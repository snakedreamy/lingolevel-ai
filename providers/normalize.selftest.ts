import assert from 'node:assert/strict'
import { normalizeAnalysisShape } from './normalize'

const user = 'What is you name?'
const assistant = 'I think you mean "What is your name?" What is your favorite book?'
const normalize = (raw: unknown) => normalizeAnalysisShape(raw, user, assistant)

for (const raw of [
  null, undefined, false, 0, 'analysis', [], [{}], {}, { unrelated: true },
  { translation: '用户: 你好\nAI: 你好' },
  { grammarCorrections: null }, { grammarCorrections: false },
  { grammarCorrections: 'none' }, { grammarCorrections: 80 },
  { grammarCorrections: {} },
  { grammarCorrections: { explanations: ['需要所有格'] } },
]) {
  assert.throws(() => normalize(raw), /normalizeAnalysisShape/)
}

for (const item of [null, false, 80, 'none', [], {}, { unrelated: true }, { corrected: user }]) {
  assert.throws(() => normalize({ grammarCorrections: [item] }), /normalizeAnalysisShape/)
}
assert.throws(() => normalize({ grammarCorrections: [{ score: 70 }, null] }), /invalid grammar correction/)

for (const score of [undefined, null, false, true, '', ' ', [], {}, NaN, Infinity, -Infinity, 'NaN', 'Infinity', 'bad']) {
  for (const grammarCorrections of [{ score }, [{ score }]]) {
    assert.throws(() => normalize({ grammarCorrections }), /invalid grammar score/)
  }
}

assert.deepEqual(normalize({ grammarCorrections: [] }).data.grammarCorrections, [])
for (const score of [0, '0', ' 0 ']) {
  for (const grammarCorrections of [{ score }, [{ score }]]) {
    const result = normalize({ grammarCorrections }).data
    assert.equal(result.grammarCorrections[0].score, 0)
    assert.equal(result.grammarCorrections[0].corrected, 'What is your name?')
  }
}

const aliases = normalize({
  translation: { userText: '你叫什么名字？', assistantResponse: '你最喜欢哪本书？' },
  grammarCorrections: [{
    original: user, correction: 'What is your name?', detail: '这里需要所有格 your。',
    nativeSuggestion: 'May I ask your name?', score: '64',
  }],
  assistantReplyInsight: {
    replyStructure: '先给出 What is your name? 作为更正，再询问喜欢的书。',
    grammarPoint: 'What is your favorite ...? 可以用来询问对方最喜欢的东西。',
    conversationPurpose: '围绕 favorite book 回答自己最喜欢的书名，再补充一个喜欢它的理由。',
  },
  keyWords: [{
    vocabulary: 'favorite', pronunciation: '/ˈfeɪvərɪt/', meaning: '最喜欢的',
    exampleSentence: 'This is my favorite book.', exampleTranslation: '这是我最喜欢的书。',
  }],
  suggestions: ['My favorite book is Dune. [我最喜欢的书是《沙丘》。]'],
})
assert.equal(aliases.coerced, true)
assert.equal(aliases.data.translation, 'User: 你叫什么名字？\nAI: 你最喜欢哪本书？')
assert.deepEqual(aliases.data.grammarCorrections[0], {
  original: user, corrected: 'What is your name?', explanation: '这里需要所有格 your。',
  politeForm: 'May I ask your name?', score: 64,
})
assert.equal(aliases.data.assistantReplyInsight.grammar, 'What is your favorite ...? 可以用来询问对方最喜欢的东西。')
assert.deepEqual(aliases.data.keyWords[0], {
  word: 'favorite', phonetic: '/ˈfeɪvərɪt/', definition: '最喜欢的',
  exampleEn: 'This is my favorite book.', exampleZh: '这是我最喜欢的书。',
})

const objectCorrection = normalize({
  grammarCorrections: {
    correctedVersion: 'What is your name?', nativeSuggestion: 'May I ask your name?', score: '0',
    explanations: ['需要所有格'], errors: [{ type: 'pronoun', detail: 'you 应改为 your' }],
  },
}).data.grammarCorrections[0]
assert.equal(objectCorrection.score, 0)
assert.equal(objectCorrection.corrected, 'What is your name?')
assert.equal(objectCorrection.politeForm, 'May I ask your name?')
assert.equal(objectCorrection.explanation, '需要所有格；pronoun: you 应改为 your')

const fromExplanation = normalize({
  grammarCorrections: [{ score: 55, corrected: user, note: '把 "you" 改成 "your"' }],
}).data.grammarCorrections[0]
assert.equal(fromExplanation.corrected, 'What is your name?')
assert.equal(fromExplanation.politeForm, 'What is your name?')
assert.equal(normalize({ grammarCorrections: [{ score: 95 }] }).data.grammarCorrections[0].corrected, user)

console.log('Analysis normalization self-test OK')
