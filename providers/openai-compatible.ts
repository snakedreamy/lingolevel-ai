// providers/openai-compatible.ts
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

export function createOpenAIProvider(cfg: ProviderConfig): Provider {
  const baseUrl = cfg.baseUrl.replace(/\/$/, '')

  async function runCompletion(label: 'chat' | 'analyze', body: unknown, signal: AbortSignal): Promise<string> {
    const url = `${baseUrl}/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify(body),
      signal
    })
    if (!res.ok) {
      const err: unknown = Object.assign(
        new Error(`OpenAI HTTP ${res.status}`),
        { status: res.status }
      )
      throw err
    }
    const json: unknown = await res.json()
    const content = readOpenAIContent(json)
    if (typeof content !== 'string' || content.length === 0) {
      throw new Error(`OpenAI ${label} returned empty content`)
    }
    if (looksLikeErrorContent(content)) {
      throw new Error(`OpenAI ${label} returned error-looking content: ${content.slice(0, 80)}…`)
    }
    return content
  }

  async function chat(input: ProviderChatInput) {
    const body = {
      model: cfg.chatModel,
      messages: [
        { role: 'system', content: input.systemInstruction },
        ...input.messages
      ],
      temperature: input.temperature ?? 0.7
    }
    try {
      const text = await callWithRetry(
        (signal) => runCompletion('chat', body, signal),
        { timeoutMs: cfg.timeoutMs }
      )

      return { content: text || 'I am listening. Go ahead!' }
    } catch (err) {
      console.error('[openai.chat] falling back:', errorMessage(err))
      return {
        content: fallbackChatReply(input.scenarioId),
        isFallback: true
      }
    }
  }

  async function analyzeJSON(input: ProviderAnalyzeInput) {
    const body = {
      model: cfg.analyzeModel,
      messages: [
        { role: 'system', content: 'You are an expert English-Chinese Bilingual Teacher. Always return a valid JSON object matching the documented shape (translation, grammarCorrections, keyWords, suggestions).' },
        { role: 'user', content: buildAnalysisUserPrompt(input.level, input.userMessage, input.assistantMessage) + JSON_EXTRACT_HINT }
      ]
    }
    try {
      const text = await callWithRetry(
        (signal) => runCompletion('analyze', body, signal),
        { timeoutMs: cfg.timeoutMs }
      )
      let parsed: unknown
      try {
        const candidate = extractJsonObject(text)
        parsed = JSON.parse(candidate)
      } catch (err) {
        throw new Error(`OpenAI analyze returned non-JSON content: ${errorMessage(err)}`)
      }
      const { data, coerced } = normalizeAnalysisShape(
        parsed,
        input.userMessage,
        input.assistantMessage
      )
      if (coerced) {
        console.warn('[openai.analyze] model output deviated from schema; coerced fields')
      }
      return { data, isFallback: false }
    } catch (err) {
      console.error('[openai.analyze] falling back:', errorMessage(err))
      return fallbackAnalyzeOutput(input.userMessage, input.assistantMessage, input.level)
    }
  }

  return { chat, analyzeJSON }
}

function readOpenAIContent(json: unknown): unknown {
  if (typeof json !== 'object' || json === null) return undefined
  const j = json as { choices?: unknown }
  if (!Array.isArray(j.choices) || j.choices.length === 0) return undefined
  const first = j.choices[0]
  if (typeof first !== 'object' || first === null) return undefined
  const message = (first as { message?: unknown }).message
  if (typeof message !== 'object' || message === null) return undefined
  return (message as { content?: unknown }).content
}
