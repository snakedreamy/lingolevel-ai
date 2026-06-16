// providers/openai-compatible.ts
import type {
  Provider, ProviderConfig, ProviderChatInput, ProviderAnalyzeInput
} from './types'
import { callWithRetry } from './retry'
import { fallbackChatReply, fallbackAnalyzeOutput } from './fallback'
import { buildAnalysisUserPrompt } from './schema'
import { errorMessage, extractJsonObject, normalizeAnalysisShape } from './util'

const JSON_EXTRACT_HINT = '\n\nIMPORTANT: Return ONLY a valid JSON object. No markdown code blocks, no commentary, no prefix. Just the raw JSON starting with { and ending with }.'

/**
 * Heuristic: does this "content" string look like an error/HTML page that a
 * misconfigured transit proxy might have returned instead of a real model
 * reply? Real model content never starts with phrases like "Error:" or
 * contains the literal text "<!DOCTYPE" or "<html". If we see those, we
 * treat the response as garbage and let retry/fallback kick in.
 */
function looksLikeErrorContent(s: string): boolean {
  const head = s.slice(0, 256).trimStart()
  if (head.length === 0) return true
  // Lowercase once for cheap checks.
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
        content: fallbackChatReply('free_chat'),
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
      // Soft-constraint JSON extraction — many third-party relays do NOT
      // enforce response_format: json_schema server-side, so the model often
      // wraps the JSON in ```json ... ``` fences or adds prefix text. We
      // extract a JSON object heuristically instead of relying on raw
      // JSON.parse(text).
      let parsed: unknown
      try {
        const candidate = extractJsonObject(text)
        parsed = JSON.parse(candidate)
      } catch (err) {
        throw new Error(`OpenAI analyze returned non-JSON content: ${errorMessage(err)}`)
      }
      // Normalize + soft validate. The relay's underlying model often
      // deviates from the documented schema (e.g. translation is sometimes
      // an object, keyWords use `chineseDefinition` instead of
      // `definition`). We coerce known deviations into the documented
      // `AnalysisResult` shape instead of throwing — that way the user
      // still gets a useful response, and we only fall back to the
      // canned `AnalysisResult` when the output is unparseable.
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
