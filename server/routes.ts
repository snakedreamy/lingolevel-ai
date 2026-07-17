// server/routes.ts
import { Router } from 'express'
import type { Request, Response } from 'express'
import type { Provider, ProviderChatInput } from '../providers'
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
import { LESSON_BY_ID } from '../src/data/learningLessons'
import type { ApplyActivity } from '../src/data/learningLessons'
import {
  buildLearningEvaluationPrompts,
  buildLearningPracticePrompts,
  learningLessonForConcept,
  normalizeLearningActivities,
  normalizeLearningEvaluation,
} from './learningPractice'

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

async function collectProviderStream(provider: Provider, input: ProviderChatInput): Promise<{ content: string; isFallback: boolean }> {
  const result = await provider.chatStream(input)
  let content = ''
  for await (const { delta } of result.stream) content += delta
  return { content, isFallback: result.isFallback }
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

function resolveRequestedModel(value: unknown, fallback: string, allowed: string[]): string | null {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const requested = value.trim()
  return allowed.includes(requested) ? requested : null
}

function resolveDiversitySeed(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
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
    const diversitySeed = resolveDiversitySeed(req.body?.diversitySeed)
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' })
    }
    const model = resolveRequestedModel(req.body?.model, cfg.chatModel, cfg.availableModels)
    if (!model) return res.status(400).json({ error: 'MODEL_NOT_ALLOWED' })

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
        model,
        systemInstruction: composeScenarioInstruction({
          levelPrompt: getLevelSystemPrompt(String(level ?? 'junior')),
          scenarioInfo,
          diversitySeed,
        }),
        temperature: 0.7,
        scenarioId: typeof scenarioInfo?.id === 'string' ? scenarioInfo.id : 'free_chat',
        diversitySeed,
        signal: abortController.signal,
      })
      for await (const { delta } of result.stream) {
        if (abortController.signal.aborted) break
        writeSSE(res, { type: 'delta', content: delta })
      }
      isFallback = result.isFallback
      if (abortController.signal.aborted) return
      writeSSE(res, { type: 'done', isFallback, timestamp: Date.now() })
      logRequest({ endpoint: 'chat', provider: cfg.provider, model, status: 200, latencyMs: Date.now() - start, fallback: isFallback })
    } catch (error) {
      if (!abortController.signal.aborted) writeSSE(res, { type: 'error', message: 'CHAT_FAILED' })
      logRequest({ endpoint: 'chat', provider: cfg.provider, model, status: 500, latencyMs: Date.now() - start, fallback: true, errorMsg: errorMessage(error) })
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
    const model = resolveRequestedModel(req.body?.model, cfg.analyzeModel, cfg.availableModels)
    if (!model) return res.status(400).json({ error: 'MODEL_NOT_ALLOWED' })
    const normalizedScenarioContext =
      typeof scenarioContext === 'string' && scenarioContext.trim() ? scenarioContext.trim() : undefined
    try {
      const { data, isFallback } = await provider.analyzeJSON({
        userMessage: String(userMessage ?? ''),
        assistantMessage: String(assistantMessage ?? ''),
        level: String(level ?? 'junior'),
        model,
        scenarioContext: normalizedScenarioContext,
      })
      logRequest({ endpoint: 'analyze', provider: cfg.provider, model, status: 200, latencyMs: Date.now() - start, fallback: !!isFallback })
      res.json({ ...(typeof data === 'object' && data !== null ? data : {}), isFallback: !!isFallback })
    } catch (error) {
      logRequest({ endpoint: 'analyze', provider: cfg.provider, model, status: 500, latencyMs: Date.now() - start, retry: 3, fallback: true, errorMsg: errorMessage(error) })
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
    const model = resolveRequestedModel(req.body?.model, cfg.chatModel, cfg.availableModels)
    if (!model) return res.status(400).json({ error: 'MODEL_NOT_ALLOWED' })
    const level = typeof req.body?.level === 'string' ? req.body.level : 'junior'
    const focus: FillBlankFocus = ['mixed', 'vocabulary', 'grammar'].includes(req.body?.focus)
      ? req.body.focus
      : 'mixed'
    const diversitySeed = resolveDiversitySeed(req.body?.diversitySeed)
    const recentSentences = Array.isArray(req.body?.recentSentences)
      ? req.body.recentSentences.filter((item: unknown): item is string => typeof item === 'string').slice(-100)
      : []
    const abortController = abortWhenClientDisconnects(req, res)
    let generated = [] as ReturnType<typeof normalizeGeneratedCards>
    let isFallback = false
    const batchSize = cfg.fillBlankBatchSize
    for (let offset = 0; offset < rawCount; offset += batchSize) {
      if (abortController.signal.aborted) return
      const count = Math.min(batchSize, rawCount - offset)
      const avoidList = [...recentSentences, ...generated.map(completeSentence)]
      const prompts = buildFillBlankPrompt({
        count,
        level,
        focus,
        recentSentences: avoidList,
        diversitySeed: diversitySeed + offset,
      })
      let batch = [] as ReturnType<typeof normalizeGeneratedCards>
      for (let attempt = 1; attempt <= cfg.fillBlankAttempts && batch.length < count; attempt++) {
        try {
          const output = await provider.chat({
            messages: [{ role: 'user', content: prompts.userPrompt }],
            model,
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
      fallback: fallbackFillBlankCards(level, focus, diversitySeed),
      count: rawCount,
      recentSentences,
    })
    const generatedCount = selectUniqueCards({ generated, fallback: [], count: rawCount, recentSentences }).length
    const fallbackCount = Math.max(0, rawCount - generatedCount)
    if (fallbackCount > 0) {
      isFallback = true
    }
    logRequest({ endpoint: 'fill-blank', provider: cfg.provider, model, status: 200, latencyMs: Date.now() - start, fallback: isFallback })
    res.json({ cards, isFallback, fallbackCount })
  })

  // POST /api/learning-practice — fresh, lesson-bounded mastery activities.
  router.post('/learning-practice', async (req, res) => {
    const start = Date.now()
    const conceptId = typeof req.body?.conceptId === 'string' ? req.body.conceptId : ''
    const lesson = learningLessonForConcept(conceptId)
    if (!lesson) return res.status(400).json({ error: 'UNKNOWN_LEARNING_CONCEPT' })
    const model = resolveRequestedModel(req.body?.model, cfg.chatModel, cfg.availableModels)
    if (!model) return res.status(400).json({ error: 'MODEL_NOT_ALLOWED' })
    const diversitySeed = resolveDiversitySeed(req.body?.diversitySeed)
    const recentPrompts = Array.isArray(req.body?.recentPrompts)
      ? req.body.recentPrompts.filter((item: unknown): item is string => typeof item === 'string').map((item: string) => item.slice(0, 600)).slice(-20)
      : []
    const prompts = buildLearningPracticePrompts({ lesson, diversitySeed, recentPrompts })
    const abortController = abortWhenClientDisconnects(req, res)
    try {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const output = await collectProviderStream(provider, {
          messages: [{ role: 'user', content: prompts.userPrompt }],
          model,
          systemInstruction: prompts.systemInstruction,
          temperature: 0.45,
          maxAttempts: 1,
          scenarioId: null,
          signal: abortController.signal,
        })
        if (output.isFallback) break
        try {
          const activities = normalizeLearningActivities(JSON.parse(extractJsonObject(output.content)), { conceptId, diversitySeed, recentPrompts })
          if (activities) {
            logRequest({ endpoint: 'learning-practice', provider: cfg.provider, model, status: 200, latencyMs: Date.now() - start, retry: attempt - 1 })
            return res.json({ activities })
          }
        } catch { /* retry malformed structured output */ }
      }
      logRequest({ endpoint: 'learning-practice', provider: cfg.provider, model, status: 503, latencyMs: Date.now() - start, retry: 1, fallback: true })
      return res.status(503).json({ error: 'LEARNING_PRACTICE_GENERATION_FAILED' })
    } catch (error) {
      if (abortController.signal.aborted) return
      logRequest({ endpoint: 'learning-practice', provider: cfg.provider, model, status: 500, latencyMs: Date.now() - start, errorMsg: errorMessage(error) })
      return res.status(500).json({ error: 'LEARNING_PRACTICE_GENERATION_FAILED' })
    }
  })

  // POST /api/learning-evaluate — AI assessment for open production only.
  router.post('/learning-evaluate', async (req, res) => {
    const start = Date.now()
    const conceptId = typeof req.body?.conceptId === 'string' ? req.body.conceptId : ''
    const lesson = learningLessonForConcept(conceptId)
    if (!lesson) return res.status(400).json({ error: 'UNKNOWN_LEARNING_CONCEPT' })
    const model = resolveRequestedModel(req.body?.model, cfg.analyzeModel, cfg.availableModels)
    if (!model) return res.status(400).json({ error: 'MODEL_NOT_ALLOWED' })
    const answer = typeof req.body?.answer === 'string' ? req.body.answer.trim().slice(0, 2000) : ''
    const rawActivity = req.body?.activity
    if (!answer || !rawActivity || rawActivity.type !== 'apply' || !Array.isArray(rawActivity.checklist)) {
      return res.status(400).json({ error: 'INVALID_LEARNING_ANSWER' })
    }
    const activity: ApplyActivity = {
      id: 'evaluation', type: 'apply', dimension: 'application',
      prompt: String(rawActivity.prompt ?? '').slice(0, 600),
      explanation: String(rawActivity.explanation ?? '').slice(0, 800),
      checklist: rawActivity.checklist.filter((item: unknown): item is string => typeof item === 'string').map((item: string) => item.slice(0, 160)).slice(0, 4),
      modelAnswer: String(rawActivity.modelAnswer ?? '').slice(0, 500),
    }
    if (!activity.prompt || activity.checklist.length < 2 || !activity.modelAnswer) return res.status(400).json({ error: 'INVALID_LEARNING_ACTIVITY' })
    const prompts = buildLearningEvaluationPrompts({ lesson, activity, answer })
    const abortController = abortWhenClientDisconnects(req, res)
    try {
      const output = await collectProviderStream(provider, {
        messages: [{ role: 'user', content: prompts.userPrompt }], model,
        systemInstruction: prompts.systemInstruction, temperature: 0.2, maxAttempts: 2,
        scenarioId: null, signal: abortController.signal,
      })
      if (output.isFallback) throw new Error('provider fallback')
      const evaluation = normalizeLearningEvaluation(JSON.parse(extractJsonObject(output.content)))
      if (!evaluation) throw new Error('invalid evaluation output')
      logRequest({ endpoint: 'learning-evaluate', provider: cfg.provider, model, status: 200, latencyMs: Date.now() - start })
      return res.json(evaluation)
    } catch (error) {
      if (abortController.signal.aborted) return
      logRequest({ endpoint: 'learning-evaluate', provider: cfg.provider, model, status: 503, latencyMs: Date.now() - start, fallback: true, errorMsg: errorMessage(error) })
      return res.status(503).json({ error: 'LEARNING_EVALUATION_FAILED' })
    }
  })

  // POST /api/ask — SSE streaming tutor answers
  router.post('/ask', async (req, res) => {
    const start = Date.now()
    const { question, level, context } = req.body ?? {}
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'question is required' })
    }
    const model = resolveRequestedModel(req.body?.model, cfg.chatModel, cfg.availableModels)
    if (!model) return res.status(400).json({ error: 'MODEL_NOT_ALLOWED' })
    const requestedLessonId = typeof context?.lessonId === 'string' ? context.lessonId : undefined
    const lesson = requestedLessonId ? LESSON_BY_ID.get(requestedLessonId) : undefined
    if (requestedLessonId && !lesson) {
      return res.status(400).json({ error: 'UNKNOWN_LEARNING_LESSON' })
    }
    const ctx =
      typeof context === 'object' && context !== null
        ? {
            word: typeof (context as any).word === 'string' ? (context as any).word : undefined,
            sentence: typeof (context as any).sentence === 'string' ? (context as any).sentence : undefined,
            lesson: lesson ? {
              title: lesson.title, objective: lesson.objective, examples: lesson.examples,
              explanation: lesson.explanation, rules: lesson.rules, contrasts: lesson.contrasts,
            } : undefined,
            activityPrompt: typeof (context as any).activityPrompt === 'string' ? (context as any).activityPrompt.slice(0, 600) : undefined,
            learnerAnswer: typeof (context as any).learnerAnswer === 'string' ? (context as any).learnerAnswer.slice(0, 2000) : undefined,
            feedback: typeof (context as any).feedback === 'string' ? (context as any).feedback.slice(0, 1200) : undefined,
          }
        : undefined
    const history = Array.isArray(req.body?.history)
      ? req.body.history
        .filter((item: unknown): item is { role: string; content: unknown } => typeof item === 'object' && item !== null && 'role' in item)
        .filter((item: { role: string }) => item.role === 'user' || item.role === 'assistant')
        .map((item: { role: string; content: unknown }) => ({ role: item.role as 'user' | 'assistant', content: String(item.content ?? '').slice(0, 4000) }))
        .slice(-cfg.maxContextMessages)
      : []

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const abortController = abortWhenClientDisconnects(req, res)

    try {
      const result = await provider.chatStream({
        messages: [...history, { role: 'user', content: buildAskUserPrompt({ question: question.trim(), context: ctx }) }],
        model,
        systemInstruction: composeAskSystemPrompt(String(level ?? 'junior')),
        temperature: 0.4,
        maxAttempts: 2,
        scenarioId: null,
        signal: abortController.signal,
      })
      const stream = result.stream[Symbol.asyncIterator]()
      const first = await stream.next()
      if (abortController.signal.aborted) {
        await stream.return?.()
        return
      }
      if (result.isFallback) {
        await stream.return?.()
        writeSSE(res, { type: 'error', message: 'ASK_UPSTREAM_UNAVAILABLE' })
        logRequest({ endpoint: 'ask', provider: cfg.provider, model, status: 503, latencyMs: Date.now() - start, fallback: true })
        return
      }
      if (first.done) throw new Error('Ask stream returned empty content')
      writeSSE(res, { type: 'delta', content: first.value.delta })
      while (true) {
        const next = await stream.next()
        if (next.done) break
        if (abortController.signal.aborted) {
          await stream.return?.()
          return
        }
        writeSSE(res, { type: 'delta', content: next.value.delta })
      }
      if (abortController.signal.aborted) return
      writeSSE(res, { type: 'done', isFallback: false })
      logRequest({ endpoint: 'ask', provider: cfg.provider, model, status: 200, latencyMs: Date.now() - start })
    } catch (error) {
      if (!abortController.signal.aborted) writeSSE(res, { type: 'error', message: 'ASK_FAILED' })
      logRequest({ endpoint: 'ask', provider: cfg.provider, model, status: 500, latencyMs: Date.now() - start, fallback: true, errorMsg: errorMessage(error) })
    } finally {
      res.end()
    }
  })

  return router
}
