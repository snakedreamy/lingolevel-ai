// providers/openai-compatible.ts
import type {
  Provider, ProviderConfig, ProviderChatInput, ProviderChatStreamOutput, ProviderAnalyzeInput, ProviderThinkingEffort
} from './types'
import { callWithRetry } from './retry'
import { fetchViaProxy } from './proxy'
import { fallbackChatReply, fallbackAnalyzeOutput } from './fallback'
import { analysisJsonSchema, buildAnalysisUserPrompt } from './schema'
import { JSON_EXTRACT_HINT, errorMessage, extractJsonObject, looksLikeErrorContent } from './util'
import { normalizeAnalysisShape } from './normalize'

function openAIReasoning(effort?: ProviderThinkingEffort): { reasoning_effort: ProviderThinkingEffort } | object {
  return effort ? { reasoning_effort: effort } : {}
}

interface OpenAISseResult {
  done: boolean
  delta?: string
}

function parseOpenAISseData(data: string): OpenAISseResult {
  if (data === '[DONE]') return { done: true }

  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return { done: false }
  }
  if (typeof parsed !== 'object' || parsed === null) return { done: false }

  const payload = parsed as {
    choices?: Array<{ delta?: { content?: unknown } }>
    error?: { message?: unknown; type?: unknown; code?: unknown }
  }
  if (payload.error) {
    const message = typeof payload.error.message === 'string' ? payload.error.message : 'unknown error'
    const type = typeof payload.error.type === 'string' ? payload.error.type : undefined
    const code = payload.error.code
    const suffix = [type, typeof code === 'string' || typeof code === 'number' ? String(code) : undefined]
      .filter(Boolean)
      .join('/')
    const error = new Error(`OpenAI stream error${suffix ? ` (${suffix})` : ''}: ${message}`) as Error & { status?: number }
    const numericStatus = typeof code === 'number' ? code : typeof code === 'string' ? Number(code) : NaN
    if (Number.isInteger(numericStatus) && numericStatus >= 400 && numericStatus <= 599) error.status = numericStatus
    throw error
  }

  const delta = payload.choices?.[0]?.delta?.content
  return { done: false, delta: typeof delta === 'string' && delta ? delta : undefined }
}

export function createOpenAIProvider(cfg: ProviderConfig): Provider {
  const baseUrl = cfg.baseUrl.replace(/\/$/, '')

  async function runCompletion(label: 'chat' | 'analyze', body: unknown, signal: AbortSignal): Promise<string> {
    const url = `${baseUrl}/chat/completions`
    // Always request streaming — some relay proxies (e.g. CPA/Cline) only
    // forward SSE responses and silently drop non-streaming content.
    const res = await fetchViaProxy(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({ ...(body as object), stream: true }),
      signal
    }, cfg.proxyUrl)
    if (!res.ok) {
      const err: unknown = Object.assign(
        new Error(`OpenAI HTTP ${res.status}`),
        { status: res.status }
      )
      throw err
    }

    const contentType = res.headers.get('content-type') ?? ''
    let content: string

    if (contentType.includes('text/event-stream')) {
      const reader = res.body?.getReader()
      if (!reader) throw new Error(`OpenAI ${label} returned no body`)
      const decoder = new TextDecoder()
      let accumulated = ''
      let buffer = ''
      let completed = false
      const consumeLine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) return
        const result = parseOpenAISseData(trimmed.slice(5).trim())
        if (result.delta) accumulated += result.delta
        if (result.done) completed = true
      }

      try {
        while (!completed) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            consumeLine(line)
            if (completed) break
          }
        }
        buffer += decoder.decode()
        if (!completed && buffer.trim()) consumeLine(buffer)
      } finally {
        await reader.cancel().catch(() => undefined)
      }
      content = accumulated
    } else {
      // --- Non-streaming JSON path (fallback for direct API calls) ---
      const json: unknown = await res.json()
      const raw = readOpenAIContent(json)
      content = typeof raw === 'string' ? raw : ''
    }

    if (content.length === 0) {
      throw new Error(`OpenAI ${label} returned empty content`)
    }
    if (looksLikeErrorContent(content)) {
      throw new Error(`OpenAI ${label} returned error-looking content: ${content.slice(0, 80)}…`)
    }
    return content
  }

  async function* runCompletionStream(
    label: 'chat' | 'analyze',
    body: unknown,
    signal: AbortSignal,
  ): AsyncGenerator<string> {
    const url = `${baseUrl}/chat/completions`
    const res = await fetchViaProxy(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ ...(body as object), stream: true }),
      signal,
    }, cfg.proxyUrl)
    if (!res.ok) {
      const err: unknown = Object.assign(new Error(`OpenAI HTTP ${res.status}`), { status: res.status })
      throw err
    }
    const reader = res.body?.getReader()
    if (!reader) throw new Error(`OpenAI ${label} returned no body`)
    const decoder = new TextDecoder()
    let buffer = ''
    const consumeLine = (line: string): OpenAISseResult | null => {
      const trimmed = line.trim()
      return trimmed.startsWith('data:')
        ? parseOpenAISseData(trimmed.slice(5).trim())
        : null
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const result = consumeLine(line)
          if (result?.done) return
          if (result?.delta) yield result.delta
        }
      }
      buffer += decoder.decode()
      if (buffer.trim()) {
        const result = consumeLine(buffer)
        if (result?.done) return
        if (result?.delta) yield result.delta
      }
    } finally {
      await reader.cancel().catch(() => undefined)
    }
  }

  async function chat(input: ProviderChatInput) {
    const body = {
      model: input.model ?? cfg.chatModel,
      messages: [
        { role: 'system', content: input.systemInstruction },
        ...input.messages
      ],
      temperature: input.temperature ?? 0.7,
      max_tokens: cfg.maxOutputTokens,
      ...openAIReasoning(input.thinkingEffort),
    }
    try {
      const text = await callWithRetry(
        (signal) => runCompletion('chat', body, signal),
        { timeoutMs: cfg.timeoutMs, retries: input.maxAttempts, signal: input.signal }
      )

      return { content: text || 'I am listening. Go ahead!' }
    } catch (err) {
      if (input.signal?.aborted) throw err
      console.error('[openai.chat] falling back:', errorMessage(err))
      return {
        content: fallbackChatReply(input.scenarioId, input.diversitySeed, input.messages.length),
        isFallback: true
      }
    }
  }

  async function chatStream(input: ProviderChatInput): Promise<ProviderChatStreamOutput> {
    const body = {
      model: input.model ?? cfg.chatModel,
      messages: [
        { role: 'system', content: input.systemInstruction },
        ...input.messages,
      ],
      temperature: input.temperature ?? 0.7,
      max_tokens: cfg.maxOutputTokens,
      ...openAIReasoning(input.thinkingEffort),
    }
    // The upstream request is lazy: it only starts when the returned stream is
    // consumed. Keep the timeout and error boundary inside that same lifecycle;
    // otherwise a `finally` in chatStream would clear the timer immediately and
    // errors thrown while iterating would bypass the fallback path.
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
        if (!emitted) throw new Error('OpenAI chat stream returned empty content')
      } catch (err) {
        // A real client disconnect should stop work silently. Before the first
        // token, other failures can still be replaced by a coherent fallback.
        // Once partial content was emitted, mixing in an unrelated fallback
        // would corrupt the answer, so let the route emit a structured error.
        if (input.signal?.aborted || emitted) throw err
        console.error('[openai.chatStream] falling back:', errorMessage(err))
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
      messages: [
        {
          role: 'system',
          content: 'You are an expert English-Chinese Bilingual Teacher. You MUST return a valid JSON object matching this exact schema:\n' + JSON.stringify(analysisJsonSchema, null, 2)
        },
        {
          role: 'user',
          content: buildAnalysisUserPrompt(input.level, input.userMessage, input.assistantMessage, input.scenarioContext) + JSON_EXTRACT_HINT
        }
      ],
      ...openAIReasoning(input.thinkingEffort),
    }
    try {
      const text = await callWithRetry(
        async (signal) => {
          const resText = await runCompletion('analyze', body, signal)
          try {
            const candidate = extractJsonObject(resText)
            return JSON.parse(candidate)
          } catch (err) {
            // Throw with 'parseable json' so isTransient in retry.ts can catch it
            throw new Error(`OpenAI analyze returned non-JSON content: no parseable json found: ${errorMessage(err)}`)
          }
        },
        { timeoutMs: cfg.timeoutMs }
      )
      
      const { data, coerced } = normalizeAnalysisShape(
        text,
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

  return { chat, chatStream, analyzeJSON }
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
