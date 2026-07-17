import type {
  Provider, ProviderConfig, ProviderChatInput, ProviderChatStreamOutput, ProviderAnalyzeInput
} from './types'
import { callWithRetry } from './retry'
import { fallbackChatReply, fallbackAnalyzeOutput } from './fallback'
import { buildAnalysisUserPrompt } from './schema'
import { JSON_EXTRACT_HINT, errorMessage, extractJsonObject, looksLikeErrorContent } from './util'
import { normalizeAnalysisShape } from './normalize'

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

  async function* runCompletionStream(
    label: 'chat' | 'analyze',
    body: unknown,
    signal: AbortSignal,
  ): AsyncGenerator<string> {
    const url = `${baseUrl}/v1/messages`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({ ...(body as object), stream: true }),
      signal,
    })
    if (!res.ok) {
      let bodySummary = ''
      try { bodySummary = (await res.text()).slice(0, 200) } catch { bodySummary = '<failed to read body>' }
      const message = bodySummary ? `Anthropic HTTP ${res.status}: ${bodySummary}` : `Anthropic HTTP ${res.status}`
      throw Object.assign(new Error(message), { status: res.status })
    }
    const reader = res.body?.getReader()
    if (!reader) throw new Error(`Anthropic ${label} returned no body`)
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const evt of events) {
        const line = evt.trim()
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        try {
          const parsed = JSON.parse(data) as {
            type?: string
            delta?: { type?: string; text?: string }
            error?: { message?: string }
          }
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield parsed.delta.text
          }
          if (parsed.type === 'error') {
            throw new Error(`Anthropic stream error: ${parsed.error?.message ?? 'unknown'}`)
          }
        } catch (err) {
          // Re-throw real stream errors; ignore JSON parse hiccups on partial lines.
          if (err instanceof Error && err.message.startsWith('Anthropic stream error')) throw err
        }
      }
    }
  }

  async function chat(input: ProviderChatInput) {
    const body = {
      model: input.model ?? cfg.chatModel,
      max_tokens: cfg.maxOutputTokens,
      system: input.systemInstruction,
      messages: input.messages,
      temperature: input.temperature ?? 0.7
    }
    try {
      const text = await callWithRetry(
        (signal) => runCompletion('chat', body, signal, parseChatText),
        { timeoutMs: cfg.timeoutMs, retries: input.maxAttempts, signal: input.signal }
      )

      return { content: text || 'I am listening. Go ahead!' }
    } catch (err) {
      if (input.signal?.aborted) throw err
      console.error('[anthropic.chat] falling back:', errorMessage(err))
      return {
        content: fallbackChatReply(input.scenarioId, input.diversitySeed, input.messages.length),
        isFallback: true
      }
    }
  }

  async function chatStream(input: ProviderChatInput): Promise<ProviderChatStreamOutput> {
    const body = {
      model: input.model ?? cfg.chatModel,
      max_tokens: cfg.maxOutputTokens,
      system: input.systemInstruction,
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
    }
    const output: ProviderChatStreamOutput = {
      stream: undefined as never,
      isFallback: false,
    }
    output.stream = (async function* () {
      const timeoutController = new AbortController()
      const timer = setTimeout(() => timeoutController.abort(), cfg.timeoutMs)
      const combined = input.signal
        ? AbortSignal.any([timeoutController.signal, input.signal])
        : timeoutController.signal
      let emitted = false

      try {
        for await (const delta of runCompletionStream('chat', body, combined)) {
          emitted = true
          yield { delta }
        }
        if (!emitted) throw new Error('Anthropic chat stream returned empty content')
      } catch (err) {
        if (input.signal?.aborted || emitted) throw err
        console.error('[anthropic.chatStream] falling back:', errorMessage(err))
        output.isFallback = true
        yield { delta: fallbackChatReply(input.scenarioId, input.diversitySeed, input.messages.length) }
      } finally {
        clearTimeout(timer)
      }
    })()
    return output
  }

  async function analyzeJSON(input: ProviderAnalyzeInput) {
    const body = {
      model: input.model ?? cfg.analyzeModel,
      max_tokens: cfg.maxOutputTokens,
      system: 'You are an expert English-Chinese Bilingual Teacher. Always return a valid JSON object matching the documented shape (translation, grammarCorrections, assistantReplyInsight, keyWords, suggestions).',
      messages: [
        { role: 'user', content: buildAnalysisUserPrompt(input.level, input.userMessage, input.assistantMessage, input.scenarioContext) + JSON_EXTRACT_HINT }
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

  return { chat, chatStream, analyzeJSON }
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
