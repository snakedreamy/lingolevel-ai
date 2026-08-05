import type { AnalysisHistoryEntry, Message } from '../types'

// minimal-debt: 当前会话使用 2 MB localStorage 快照；当需要长期或跨设备历史时迁移到 IndexedDB 或服务端分页存储。
export const CHAT_SESSION_STORAGE_BUDGET_BYTES = 2_000_000

export interface StoredChatSession {
  version: 1
  scenarioId: string
  diversitySeed: number
  messages: Message[]
  analysisHistory: AnalysisHistoryEntry[]
  selectedAnalysisIndex: number
}

export function serializedStorageBytes(value: unknown): number {
  return JSON.stringify(value).length * 2
}

export function hasOrphanedUserMessage(messages: Message[]): boolean {
  return messages.some((message, index) => message.role === 'user' && messages[index + 1]?.role !== 'assistant')
}

function selectedEntryId(session: StoredChatSession): string | undefined {
  return session.analysisHistory[session.selectedAnalysisIndex]?.id
}

function selectedIndexAfterTrim(history: AnalysisHistoryEntry[], previousId: string | undefined): number {
  if (history.length === 0) return 0
  const preservedIndex = previousId ? history.findIndex((entry) => entry.id === previousId) : -1
  return preservedIndex >= 0 ? preservedIndex : history.length - 1
}

export function removeOldestChatTurn(session: StoredChatSession): StoredChatSession | null {
  const completeTurns: Array<[number, number]> = []
  for (let index = 0; index < session.messages.length - 1; index += 1) {
    if (session.messages[index].role === 'user' && session.messages[index + 1].role === 'assistant') {
      completeTurns.push([index, index + 1])
    }
  }
  if (completeTurns.length <= 1) return null
  const [userIndex, assistantIndex] = completeTurns[0]
  const userMessage = session.messages[userIndex]
  const assistantMessage = session.messages[assistantIndex]
  const previousSelectedId = selectedEntryId(session)
  const analysisHistory = session.analysisHistory.filter((entry) => {
    const matchesIds = entry.userMessageId === userMessage.id || entry.assistantMessageId === assistantMessage.id
    const matchesLegacyText = !entry.userMessageId && !entry.assistantMessageId
      && entry.userMessage === userMessage.content && entry.assistantMessage === assistantMessage.content
    return !matchesIds && !matchesLegacyText
  })

  return {
    ...session,
    messages: session.messages.filter((_message, index) => index !== userIndex && index !== assistantIndex),
    analysisHistory,
    selectedAnalysisIndex: selectedIndexAfterTrim(analysisHistory, previousSelectedId),
  }
}

export function trimChatSessionToBudget(
  session: StoredChatSession,
  maxBytes = CHAT_SESSION_STORAGE_BUDGET_BYTES,
): { session: StoredChatSession; trimmed: boolean; fits: boolean } {
  let candidate = session
  let trimmed = false
  while (serializedStorageBytes(candidate) > maxBytes) {
    const next = removeOldestChatTurn(candidate)
    if (!next) break
    candidate = next
    trimmed = true
  }
  return { session: candidate, trimmed, fits: serializedStorageBytes(candidate) <= maxBytes }
}
