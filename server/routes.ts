// server/routes.ts
import { Router } from 'express'
import type { Request, Response } from 'express'
import type { Provider } from '../providers'
import type { ServerConfig } from '../providers'
import { loadServerConfigFromEnv } from '../providers'
import { errorMessage, extractJsonObject } from '../providers/util'
import {
  composeScenarioInstruction,
  getLevelSystemPrompt,
  composeAskSystemPrompt,
  buildAskUserPrompt,
} from './prompts'
import {
  buildFillBlankPrompt,
  completeSentence,
  fallbackFillBlankCards,
  normalizeGeneratedCards,
  selectUniqueCards,
} from './fillBlank'
import type { FillBlankFocus } from '../src/types'
import { FILL_BLANK_MAX_COUNT, FILL_BLANK_MIN_COUNT } from '../src/types'

function logRequest(args: {
  endpoint: string; provider: string; model: string; status: number
  latencyMs: number; retry?: number; fallback?: boolean; errorMsg?: string
}) {
  const { endpoint, provider, model, status, latencyMs, retry = 0, fallback = false, errorMsg } = args
  const base = `[${endpoint}] ${provider}/${model} → ${status} (${latencyMs}ms, retry=${retry}, fallback=${fallback})`
  console.log(errorMsg ? `${base} error=${JSON.stringify(errorMsg)}` : base)
}

function writeSSE(res: Response, payload: unknown): void {
  if (res.destroyed || res.writableEnded) return
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function abortWhenClientDisconnects(req: Request, res: Response): AbortController {
  const controller = new AbortController()
  const abort = () => {
    if (!res.writableEnded) controller.abort()
  }
  // `req.close` can mean that the request body has merely finished, depending
  // on the client/runtime. `req.aborted` and an unfinished response closing are
  // the signals that actually mean the SSE consumer went away.
  req.once('aborted', abort)
  res.once('close', abort)
  return controller
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

    const abortController = abortWhenClientDisconnects(req, res)

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
      for await (const { delta } of result.stream) {
        if (abortController.signal.aborted) break
        writeSSE(res, { type: 'delta', content: delta })
      }
      isFallback = result.isFallback
      if (abortController.signal.aborted) return
      writeSSE(res, { type: 'done', isFallback, timestamp: Date.now() })
      logRequest({ endpoint: 'chat', provider: cfg.provider, model: cfg.chatModel, status: 200, latencyMs: Date.now() - start, fallback: isFallback })
    } catch (error) {
      if (!abortController.signal.aborted) writeSSE(res, { type: 'error', message: 'CHAT_FAILED' })
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

  // POST /api/fill-blank — generate a deduplicated cloze practice set.
  router.post('/fill-blank', async (req, res) => {
    const start = Date.now()
    const rawCount = Number(req.body?.count)
    if (!Number.isInteger(rawCount) || rawCount < FILL_BLANK_MIN_COUNT || rawCount > FILL_BLANK_MAX_COUNT) {
      return res.status(400).json({ error: `count must be an integer between ${FILL_BLANK_MIN_COUNT} and ${FILL_BLANK_MAX_COUNT}` })
    }
    const level = typeof req.body?.level === 'string' ? req.body.level : 'junior'
    const focus: FillBlankFocus = ['mixed', 'vocabulary', 'grammar'].includes(req.body?.focus)
      ? req.body.focus
      : 'mixed'
    const recentSentences = Array.isArray(req.body?.recentSentences)
      ? req.body.recentSentences.filter((item: unknown): item is string => typeof item === 'string').slice(-100)
      : []
    const scenario = typeof req.body?.scenario === 'object' && req.body.scenario !== null
      ? {
          name: typeof req.body.scenario.name === 'string' ? req.body.scenario.name : undefined,
          englishName: typeof req.body.scenario.englishName === 'string' ? req.body.scenario.englishName : undefined,
          description: typeof req.body.scenario.description === 'string' ? req.body.scenario.description : undefined,
        }
      : undefined
    const abortController = abortWhenClientDisconnects(req, res)
    let generated = [] as ReturnType<typeof normalizeGeneratedCards>
    let isFallback = false
    const batchSize = cfg.fillBlankBatchSize
    for (let offset = 0; offset < rawCount; offset += batchSize) {
      if (abortController.signal.aborted) return
      const count = Math.min(batchSize, rawCount - offset)
      const avoidList = [...recentSentences, ...generated.map(completeSentence)]
      const prompts = buildFillBlankPrompt({ count, level, focus, scenario, recentSentences: avoidList })
      let batch = [] as ReturnType<typeof normalizeGeneratedCards>
      for (let attempt = 1; attempt <= cfg.fillBlankAttempts && batch.length < count; attempt++) {
        try {
          const output = await provider.chat({
            messages: [{ role: 'user', content: prompts.userPrompt }],
            systemInstruction: prompts.systemInstruction,
            temperature: 0.65,
            maxAttempts: 1,
            scenarioId: null,
            signal: abortController.signal,
          })
          const candidate = output.isFallback
            ? []
            : normalizeGeneratedCards(JSON.parse(extractJsonObject(output.content)), focus)
          batch = selectUniqueCards({
            generated: [...batch, ...candidate],
            fallback: [],
            count,
            recentSentences: avoidList,
          })
          if (output.isFallback) {
            console.warn(`[fill-blank] provider fallback on structured attempt ${attempt}/${cfg.fillBlankAttempts}`)
          } else if (candidate.length < count) {
            console.warn(
              `[fill-blank] structured attempt ${attempt}/${cfg.fillBlankAttempts} accepted ${candidate.length}/${count} teaching-complete cards`
            )
          }
        } catch (error) {
          if (abortController.signal.aborted) return
          console.warn(`[fill-blank] invalid structured output on attempt ${attempt}/${cfg.fillBlankAttempts}: ${errorMessage(error)}`)
        }
      }
      generated = [...generated, ...batch]
      if (batch.length < count) isFallback = true
    }
    if (abortController.signal.aborted) return
    const cards = selectUniqueCards({
      generated,
      fallback: fallbackFillBlankCards(level, focus),
      count: rawCount,
      recentSentences,
    })
    const generatedCount = selectUniqueCards({ generated, fallback: [], count: rawCount, recentSentences }).length
    const fallbackCount = Math.max(0, rawCount - generatedCount)
    if (fallbackCount > 0) {
      isFallback = true
    }
    logRequest({ endpoint: 'fill-blank', provider: cfg.provider, model: cfg.chatModel, status: 200, latencyMs: Date.now() - start, fallback: isFallback })
    res.json({ cards, isFallback, fallbackCount })
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

    const abortController = abortWhenClientDisconnects(req, res)

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
      if (abortController.signal.aborted) return
      writeSSE(res, { type: 'done', isFallback: result.isFallback })
      logRequest({ endpoint: 'ask', provider: cfg.provider, model: cfg.chatModel, status: 200, latencyMs: Date.now() - start, fallback: result.isFallback })
    } catch (error) {
      if (!abortController.signal.aborted) writeSSE(res, { type: 'error', message: 'ASK_FAILED' })
      logRequest({ endpoint: 'ask', provider: cfg.provider, model: cfg.chatModel, status: 500, latencyMs: Date.now() - start, fallback: true, errorMsg: errorMessage(error) })
    } finally {
      res.end()
    }
  })

  return router
}
