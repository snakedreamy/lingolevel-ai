// providers/openai-compatible.ts
import type {
  Provider, ProviderConfig, ProviderChatInput, ProviderChatStreamOutput, ProviderAnalyzeInput
} from './types'
import { callWithRetry } from './retry'
import { fallbackChatReply, fallbackAnalyzeOutput } from './fallback'
import { analysisJsonSchema, buildAnalysisUserPrompt } from './schema'
import { JSON_EXTRACT_HINT, errorMessage, extractJsonObject, looksLikeErrorContent } from './util'
import { normalizeAnalysisShape } from './normalize'

export function createOpenAIProvider(cfg: ProviderConfig): Provider {
  const baseUrl = cfg.baseUrl.replace(/\/$/, '')

  async function runCompletion(label: 'chat' | 'analyze', body: unknown, signal: AbortSignal): Promise<string> {
    const url = `${baseUrl}/chat/completions`
    // Always request streaming — some relay proxies (e.g. CPA/Cline) only
    // forward SSE responses and silently drop non-streaming content.
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({ ...(body as object), stream: true }),
      signal
    })
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
      // --- SSE streaming path ---
      const reader = res.body?.getReader()
      if (!reader) throw new Error(`OpenAI ${label} returned no body`)
      const decoder = new TextDecoder()
      let accumulated = ''
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Keep the last partial line in the buffer
        buffer = lines.pop() ?? ''
        
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) accumulated += delta
          } catch { /* ignore malformed SSE lines */ }
        }
      }
      // Flush the remaining buffer if it contains data
      if (buffer.trim().startsWith('data:')) {
         const data = buffer.trim().slice(5).trim()
         if (data !== '[DONE]') {
           try {
             const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }
             const delta = parsed.choices?.[0]?.delta?.content
             if (delta) accumulated += delta
           } catch {}
         }
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
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ ...(body as object), stream: true }),
      signal,
    })
    if (!res.ok) {
      const err: unknown = Object.assign(new Error(`OpenAI HTTP ${res.status}`), { status: res.status })
      throw err
    }
    const reader = res.body?.getReader()
    if (!reader) throw new Error(`OpenAI ${label} returned no body`)
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch { /* ignore malformed SSE lines */ }
      }
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
        content: fallbackChatReply(input.scenarioId),
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
        yield { delta: fallbackChatReply(input.scenarioId) }
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
      ]
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
