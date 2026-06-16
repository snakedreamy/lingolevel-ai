// providers/anthropic.ts
import type {
  Provider, ProviderConfig, ProviderChatInput, ProviderAnalyzeInput
} from './types'
import { callWithRetry } from './retry'
import { fallbackChatReply, fallbackAnalyzeOutput } from './fallback'
import { buildAnalysisUserPrompt } from './schema'
import { errorMessage, extractJsonObject, normalizeAnalysisShape } from './util'

const ANTHROPIC_VERSION = '2023-06-01'
const JSON_EXTRACT_HINT = '\n\nIMPORTANT: Return ONLY a valid JSON object. No markdown code blocks, no commentary, no prefix. Just the raw JSON starting with { and ending with }.'

/**
 * Heuristic: does this text block look like an error/HTML page that a
 * misconfigured transit proxy might have returned instead of a real model
 * reply? Mirrors the same checks as the OpenAI-compatible adapter so the two
 * adapters behave consistently when garbage flows in.
 */
function looksLikeErrorContent(s: string): boolean {
  const head = s.slice(0, 256).trimStart()
  if (head.length === 0) return true
  const lower = head.toLowerCase()
  if (
    lower.startsWith('error:') ||
    lower.startsWith('error -') ||
    lower.startsWith('invalid api') ||
    lower.startsWith('authentication') ||
    lower.startsWith('unauthorized') ||
    lower.startsWith('forbidden') ||
    lower.startsWith('access denied') ||
    lower.startsWith('not found') ||
    lower.startsWith('bad request') ||
    lower.startsWith('<!doctype') ||
    lower.startsWith('<html') ||
    lower.startsWith('{"error"') ||
    lower.startsWith('{"type":"error"') ||
    lower.startsWith('an error occurred')
  ) {
    return true
  }
  return false
}

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
        content: fallbackChatReply('free_chat'),
        isFallback: true
      }
    }
  }

  async function analyzeJSON(input: ProviderAnalyzeInput) {
    const body = {
      model: cfg.analyzeModel,
      max_tokens: 4096,
      system: 'You are an expert English-Chinese Bilingual Teacher. Always return a valid JSON object matching the documented shape (translation, grammarCorrections, keyWords, suggestions).',
      messages: [
        { role: 'user', content: buildAnalysisUserPrompt(input.level, input.userMessage, input.assistantMessage) + JSON_EXTRACT_HINT }
      ]
    }
    try {
      const text = await callWithRetry(
        (signal) => runCompletion('analyze', body, signal, parseAnalyzeText),
        { timeoutMs: cfg.timeoutMs }
      )
      // Soft-constraint JSON extraction — the transit relay does NOT
      // enforce tool_choice server-side, so the model may wrap JSON in
      // ```json ... ``` fences or add prefix text. We extract a JSON
      // object heuristically (same approach as the OpenAI adapter).
      let parsed: unknown
      try {
        const candidate = extractJsonObject(text)
        parsed = JSON.parse(candidate)
      } catch (err) {
        throw new Error(`Anthropic analyze returned non-JSON content: ${errorMessage(err)}`)
      }
      // Normalize + soft validate. The relay's underlying model often
      // deviates from the documented schema (e.g. translation is sometimes
      // an object, keyWords use `chineseDefinition` instead of
      // `definition`). We coerce known deviations into the documented
      // `AnalysisResult` shape instead of throwing — that way the user
      // still gets a useful response.
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

/**
 * Pull all `type === "text"` blocks out of an Anthropic Messages response,
 * skipping `thinking` blocks and any other non-text content. The relay's
 * `deepseek-v4-flash` model emits a `type: "thinking"` block carrying the
 * chain-of-thought reasoning that must NOT be mixed into the user-visible
 * chat reply. We only concatenate the actual `text` blocks.
 */
function readAssistantTextBlocks(json: unknown): string {
  const blocks = readContentBlocks(json)
  const parts: string[] = []
  for (const b of blocks) {
    if (typeof b !== 'object' || b === null) continue
    const block = b as { type?: unknown; text?: unknown }
    if (block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text)
    }
    // intentionally skip `type === "thinking"` and any other unknown types
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
