import assert from 'node:assert/strict'
import { hasOrphanedUserMessage, removeOldestChatTurn, serializedStorageBytes, trimChatSessionToBudget } from './chatSessionStorage'
import type { StoredChatSession } from './chatSessionStorage'
import { saveStoredJson } from './storage'
import type { AnalysisHistoryEntry, AnalysisResult, Message } from '../types'

const analysis: AnalysisResult = {
  translation: '翻译',
  grammarCorrections: [],
  assistantReplyInsight: { structure: '结构', grammar: '语法', whyThisReply: '原因' },
  keyWords: [],
  suggestions: [],
}

function turn(index: number): { messages: Message[]; entry: AnalysisHistoryEntry } {
  const user: Message = { id: `user-${index}`, role: 'user', content: `user ${index}`, timestamp: index * 2 }
  const assistant: Message = { id: `assistant-${index}`, role: 'assistant', content: `assistant ${index}`, timestamp: index * 2 + 1 }
  return {
    messages: [user, assistant],
    entry: {
      id: `analysis-${index}`,
      userMessageId: user.id,
      assistantMessageId: assistant.id,
      userMessage: user.content,
      assistantMessage: assistant.content,
      analysis,
      createdAt: index,
    },
  }
}

const turns = [turn(1), turn(2), turn(3)]
const session: StoredChatSession = {
  version: 1,
  scenarioId: 'free_chat',
  diversitySeed: 0,
  messages: [
    { id: 'starter', role: 'assistant', content: 'Hello', timestamp: 0 },
    ...turns.flatMap((item) => item.messages),
  ],
  analysisHistory: turns.map((item) => item.entry),
  selectedAnalysisIndex: 2,
}

const once = removeOldestChatTurn(session)
assert.ok(once)
assert.deepEqual(once.messages.map((message) => message.id), ['starter', 'user-2', 'assistant-2', 'user-3', 'assistant-3'])
assert.deepEqual(once.analysisHistory.map((entry) => entry.id), ['analysis-2', 'analysis-3'])
assert.equal(once.selectedAnalysisIndex, 1)

const orphanedMessages: Message[] = [
  { id: 'starter', role: 'assistant', content: 'Hello', timestamp: 0 },
  { id: 'orphan', role: 'user', content: 'unfinished', timestamp: 1 },
  ...turns[0].messages,
  ...turns[1].messages,
]
assert.equal(hasOrphanedUserMessage(orphanedMessages), true)
assert.equal(hasOrphanedUserMessage(session.messages), false)
const orphaned = removeOldestChatTurn({
  ...session,
  messages: orphanedMessages,
  analysisHistory: [turns[0].entry, turns[1].entry],
  selectedAnalysisIndex: 1,
})
assert.ok(orphaned)
assert.deepEqual(orphaned.messages.map((message) => message.id), ['starter', 'orphan', 'user-2', 'assistant-2'])
assert.deepEqual(orphaned.analysisHistory.map((entry) => entry.id), ['analysis-2'])

const twice = removeOldestChatTurn(once)
assert.ok(twice)
const fitted = trimChatSessionToBudget(session, serializedStorageBytes(twice))
assert.equal(fitted.fits, true)
assert.equal(fitted.trimmed, true)
assert.deepEqual(fitted.session.messages.map((message) => message.id), twice.messages.map((message) => message.id))
assert.deepEqual(fitted.session.analysisHistory.map((entry) => entry.id), ['analysis-3'])
assert.equal(fitted.session.selectedAnalysisIndex, 0)

const impossible = trimChatSessionToBudget(session, 1)
assert.equal(impossible.fits, false)
assert.deepEqual(impossible.session.messages.map((message) => message.id), ['starter', 'user-3', 'assistant-3'])
assert.deepEqual(impossible.session.analysisHistory.map((entry) => entry.id), ['analysis-3'])

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: { setItem: () => { throw new DOMException('blocked', 'SecurityError') } } },
})
assert.equal(saveStoredJson('test', { ok: true }), false)
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: { setItem: () => undefined } },
})
assert.equal(saveStoredJson('test', { ok: true }), true)

console.log('Chat session storage self-test OK')
