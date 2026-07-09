// server/routes.ts
import { Router } from 'express'
import type { Provider } from '../providers'
import type { ServerConfig } from '../providers'
import { loadServerConfigFromEnv } from '../providers'
import { errorMessage } from '../providers/util'
import {
  composeScenarioInstruction,
  getLevelSystemPrompt,
  composeAskSystemPrompt,
  buildAskUserPrompt,
} from './prompts'

function logRequest(args: {
  endpoint: string; provider: string; model: string; status: number
  latencyMs: number; retry?: number; fallback?: boolean; errorMsg?: string
}) {
  const { endpoint, provider, model, status, latencyMs, retry = 0, fallback = false, errorMsg } = args
  const base = `[${endpoint}] ${provider}/${model} → ${status} (${latencyMs}ms, retry=${retry}, fallback=${fallback})`
  console.log(errorMsg ? `${base} error=${JSON.stringify(errorMsg)}` : base)
}

function writeSSE(res: any, payload: unknown): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

export function createApiRouter(args: { provider: Provider; cfg: ServerConfig }): Router {
  const { provider, cfg } = args
  const router = Router()

  // GET /api/server-config (unchanged)
  router.get('/server-config', (_req, res) => {
    try {
      res.json(loadServerConfigFromEnv())
    } catch (error) {
      res.status(500).json({ error: 'SERVER_CONFIG_UNAVAILABLE', message: errorMessage(error) })
    }
  })

  // POST /api/chat — SSE streaming
  router.post('/chat', async (req, res) => {
    const start = Date.now()
    const { messages, level, scenarioInfo } = req.body ?? {}
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' })
    }

    const chatMessages = (messages as unknown[])
      .filter((m): m is { role: string; content: unknown } =>
        typeof m === 'object' && m !== null && 'role' in m)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: String(m.content ?? '') }))
      .slice(-cfg.maxContextMessages)

    if (chatMessages.length === 0) {
      chatMessages.push({
        role: 'user',
        content: `Say hello and welcome me to practice English. Context: ${scenarioInfo?.name ?? 'General practice'}.`,
      })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering

    const abortController = new AbortController()
    req.on('close', () => abortController.abort())

    let isFallback = false
    try {
      const result = await provider.chatStream({
        messages: chatMessages,
        systemInstruction: composeScenarioInstruction({
          levelPrompt: getLevelSystemPrompt(String(level ?? 'junior')),
          scenarioInfo,
        }),
        temperature: 0.7,
        scenarioId: typeof scenarioInfo?.id === 'string' ? scenarioInfo.id : 'free_chat',
        signal: abortController.signal,
      })
      isFallback = result.isFallback
      for await (const { delta } of result.stream) {
        if (abortController.signal.aborted) break
        writeSSE(res, { type: 'delta', content: delta })
      }
      writeSSE(res, { type: 'done', isFallback, timestamp: Date.now() })
      logRequest({ endpoint: 'chat', provider: cfg.provider, model: cfg.chatModel, status: 200, latencyMs: Date.now() - start, fallback: isFallback })
    } catch (error) {
      writeSSE(res, { type: 'error', message: 'CHAT_FAILED' })
      logRequest({ endpoint: 'chat', provider: cfg.provider, model: cfg.chatModel, status: 500, latencyMs: Date.now() - start, fallback: true, errorMsg: errorMessage(error) })
    } finally {
      res.end()
    }
  })

  // POST /api/analyze (unchanged, non-streaming)
  router.post('/analyze', async (req, res) => {
    const start = Date.now()
    const { userMessage, assistantMessage, level, scenarioContext } = req.body ?? {}
    if (!userMessage && !assistantMessage) {
      return res.status(400).json({ error: 'userMessage or assistantMessage is required' })
    }
    const normalizedScenarioContext =
      typeof scenarioContext === 'string' && scenarioContext.trim() ? scenarioContext.trim() : undefined
    try {
      const { data, isFallback } = await provider.analyzeJSON({
        userMessage: String(userMessage ?? ''),
        assistantMessage: String(assistantMessage ?? ''),
        level: String(level ?? 'junior'),
        scenarioContext: normalizedScenarioContext,
      })
      logRequest({ endpoint: 'analyze', provider: cfg.provider, model: cfg.analyzeModel, status: 200, latencyMs: Date.now() - start, fallback: !!isFallback })
      res.json({ ...(typeof data === 'object' && data !== null ? data : {}), isFallback: !!isFallback })
    } catch (error) {
      logRequest({ endpoint: 'analyze', provider: cfg.provider, model: cfg.analyzeModel, status: 500, latencyMs: Date.now() - start, retry: 3, fallback: true, errorMsg: errorMessage(error) })
      res.status(500).json({ error: 'ANALYZE_FAILED' })
    }
  })

  // POST /api/ask — SSE streaming tutor answers
  router.post('/ask', async (req, res) => {
    const start = Date.now()
    const { question, level, context } = req.body ?? {}
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'question is required' })
    }
    const ctx =
      typeof context === 'object' && context !== null
        ? {
            word: typeof (context as any).word === 'string' ? (context as any).word : undefined,
            sentence: typeof (context as any).sentence === 'string' ? (context as any).sentence : undefined,
          }
        : undefined

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const abortController = new AbortController()
    req.on('close', () => abortController.abort())

    try {
      const result = await provider.chatStream({
        messages: [{ role: 'user', content: buildAskUserPrompt({ question: question.trim(), context: ctx }) }],
        systemInstruction: composeAskSystemPrompt(String(level ?? 'junior')),
        temperature: 0.4,
        scenarioId: null,
        signal: abortController.signal,
      })
      for await (const { delta } of result.stream) {
        if (abortController.signal.aborted) break
        writeSSE(res, { type: 'delta', content: delta })
      }
      writeSSE(res, { type: 'done', isFallback: result.isFallback })
      logRequest({ endpoint: 'ask', provider: cfg.provider, model: cfg.chatModel, status: 200, latencyMs: Date.now() - start, fallback: result.isFallback })
    } catch (error) {
      writeSSE(res, { type: 'error', message: 'ASK_FAILED' })
      logRequest({ endpoint: 'ask', provider: cfg.provider, model: cfg.chatModel, status: 500, latencyMs: Date.now() - start, fallback: true, errorMsg: errorMessage(error) })
    } finally {
      res.end()
    }
  })

  return router
}
