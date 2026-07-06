import type {
  Provider, ProviderConfig, ProviderChatInput, ProviderAnalyzeInput
} from './types'
import { callWithRetry } from './retry'
import { fallbackChatReply, fallbackAnalyzeOutput } from './fallback'
import { buildAnalysisUserPrompt } from './schema'
import {
  JSON_EXTRACT_HINT,
  errorMessage,
  extractJsonObject,
  looksLikeErrorContent,
  normalizeAnalysisShape,
} from './util'

const ANTHROPIC_VERSION = '2023-06-01'

export function createAnthropicProvider(cfg: ProviderConfig): Provider {
  const baseUrl = cfg.baseUrl.replace(/\/$/, '')

  async function runCompletion<T>(
    label: 'chat' | 'analyze',
    body: unknown,
    signal: AbortSignal,
    parseResponse: (json: unknown) => T
  ): Promise<T> {
    const url = `${baseUrl}/v1/messages`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify(body),
      signal
    })
    if (!res.ok) {
      let bodySummary = ''
      try {
        const text = await res.text()
        bodySummary = text.slice(0, 200)
      } catch {
        bodySummary = '<failed to read body>'
      }
      const message = bodySummary
        ? `Anthropic HTTP ${res.status}: ${bodySummary}`
        : `Anthropic HTTP ${res.status}`
      const err: unknown = Object.assign(
        new Error(message),
        { status: res.status }
      )
      throw err
    }
    const json: unknown = await res.json()
    return parseResponse(json)
  }

  async function chat(input: ProviderChatInput) {
    const body = {
      model: cfg.chatModel,
      max_tokens: 1024,
      system: input.systemInstruction,
      messages: input.messages,
      temperature: input.temperature ?? 0.7
    }
    try {
      const text = await callWithRetry(
        (signal) => runCompletion('chat', body, signal, parseChatText),
        { timeoutMs: cfg.timeoutMs }
      )

      return { content: text || 'I am listening. Go ahead!' }
    } catch (err) {
      console.error('[anthropic.chat] falling back:', errorMessage(err))
      return {
        content: fallbackChatReply(input.scenarioId),
        isFallback: true
      }
    }
  }

  async function analyzeJSON(input: ProviderAnalyzeInput) {
    const body = {
      model: cfg.analyzeModel,
      max_tokens: 4096,
      system: 'You are an expert English-Chinese Bilingual Teacher. Always return a valid JSON object matching the documented shape (translation, grammarCorrections, assistantReplyInsight, keyWords, suggestions).',
      messages: [
        { role: 'user', content: buildAnalysisUserPrompt(input.level, input.userMessage, input.assistantMessage) + JSON_EXTRACT_HINT }
      ]
    }
    try {
      const text = await callWithRetry(
        (signal) => runCompletion('analyze', body, signal, parseAnalyzeText),
        { timeoutMs: cfg.timeoutMs }
      )
      let parsed: unknown
      try {
        const candidate = extractJsonObject(text)
        parsed = JSON.parse(candidate)
      } catch (err) {
        throw new Error(`Anthropic analyze returned non-JSON content: ${errorMessage(err)}`)
      }
      const { data, coerced } = normalizeAnalysisShape(
        parsed,
        input.userMessage,
        input.assistantMessage
      )
      if (coerced) {
        console.warn('[anthropic.analyze] model output deviated from schema; coerced fields')
      }
      return { data, isFallback: false }
    } catch (err) {
      console.error('[anthropic.analyze] falling back:', errorMessage(err))
      return fallbackAnalyzeOutput(input.userMessage, input.assistantMessage, input.level)
    }
  }

  return { chat, analyzeJSON }
}

function readContentBlocks(json: unknown): unknown[] {
  if (typeof json !== 'object' || json === null) return []
  const j = json as { content?: unknown }
  if (!Array.isArray(j.content)) return []
  return j.content
}

function readAssistantTextBlocks(json: unknown): string {
  const blocks = readContentBlocks(json)
  const parts: string[] = []
  for (const b of blocks) {
    if (typeof b !== 'object' || b === null) continue
    const block = b as { type?: unknown; text?: unknown }
    if (block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text)
    }
  }
  return parts.join('')
}

function parseChatText(json: unknown): string {
  const text = readAssistantTextBlocks(json)
  if (text.length === 0) {
    throw new Error('Anthropic chat returned empty text content')
  }
  if (looksLikeErrorContent(text)) {
    throw new Error(`Anthropic chat returned error-looking content: ${text.slice(0, 80)}…`)
  }
  return text
}

function parseAnalyzeText(json: unknown): string {
  const text = readAssistantTextBlocks(json)
  if (text.length === 0) {
    throw new Error('Anthropic analyze returned empty text content')
  }
  if (looksLikeErrorContent(text)) {
    throw new Error(`Anthropic analyze returned error-looking content: ${text.slice(0, 80)}…`)
  }
  return text
}
