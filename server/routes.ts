// server/routes.ts
import { Router } from 'express'
import type { Request, Response } from 'express'
import type { Provider, ProviderChatInput, ProviderThinkingEffort } from '../providers'
import type { ServerConfig } from '../providers'
import type { TtsLanguage, TtsProvider } from '../providers/tts'
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
import type { DifficultyLevel, FillBlankFocus } from '../src/types'
import { FILL_BLANK_MAX_COUNT, FILL_BLANK_MIN_COUNT, isDifficultyLevel } from '../src/types'
import { LESSON_BY_ID } from '../src/data/learningLessons'
import type { ApplyActivity } from '../src/data/learningLessons'
import {
  buildLearningEvaluationPrompts,
  buildLearningPracticePrompts,
  learningLessonForConcept,
  normalizeLearningActivities,
  normalizeLearningEvaluation,
  staticLearningActivities,
} from './learningPractice'

const THINKING_EFFORTS = new Set<ProviderThinkingEffort>(['low', 'medium', 'high', 'xhigh', 'max'])
const ASK_CONTEXT_SOURCES = new Set(['chat', 'fill-blank', 'learning'])
const ASK_FOCUS_TYPES = new Set(['word', 'sentence', 'section'])
const TTS_LANGUAGES = new Set<TtsLanguage>(['zh-CN', 'en-US', 'en-GB'])

// Only validate shape here. Overall input capacity is governed by Express's
// 1 MB body limit, while conversational history count uses MAX_CONTEXT_MESSAGES.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function resolveLevel(value: unknown): DifficultyLevel | null {
  return isDifficultyLevel(value) ? value : null
}

function resolveScenario(value: unknown): { id: string; name: string; englishName: string; description: string } | null {
  if (!isRecord(value)) return null
  const id = requiredText(value.id)
  const name = requiredText(value.name)
  const englishName = requiredText(value.englishName)
  const description = requiredText(value.description)
  return id && name && englishName && description ? { id, name, englishName, description } : null
}

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

function resolveThinkingEffort(value: unknown): ProviderThinkingEffort | undefined {
  return typeof value === 'string' && THINKING_EFFORTS.has(value as ProviderThinkingEffort)
    ? value as ProviderThinkingEffort
    : undefined
}

export function createApiRouter(args: {
  provider: Provider
  cfg: ServerConfig
  ttsProvider: TtsProvider | null
  ttsMaxTextChars: number
}): Router {
  const { provider, cfg, ttsProvider, ttsMaxTextChars } = args
  const router = Router()

  router.get('/server-config', (_req, res) => { res.json(cfg) })

  // POST /api/tts — provider-neutral speech synthesis.
  router.post('/tts', async (req, res) => {
    if (!ttsProvider) return res.status(503).json({ error: 'TTS_UNAVAILABLE' })

    const text = requiredText(req.body?.text)
    if (!text) return res.status(400).json({ error: 'INVALID_TTS_TEXT' })
    // minimal-debt: 当前 API 回退一次合成完整文本；当长度限制实际阻断播报或首包延迟成为问题时改为分段流式合成。
    if (text.length > ttsMaxTextChars) {
      return res.status(400).json({ error: 'TTS_TEXT_TOO_LONG', maxTextChars: ttsMaxTextChars })
    }
    const language = typeof req.body?.language === 'string' && TTS_LANGUAGES.has(req.body.language as TtsLanguage)
      ? req.body.language as TtsLanguage
      : null
    if (!language) return res.status(400).json({ error: 'INVALID_TTS_LANGUAGE' })
    const speed = req.body?.speed
    if (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0.5 || speed > 1.5) {
      return res.status(400).json({ error: 'INVALID_TTS_SPEED' })
    }

    const start = Date.now()
    const abortController = abortWhenClientDisconnects(req, res)
    try {
      const output = await ttsProvider.synthesize({ text, language, speed, signal: abortController.signal })
      if (abortController.signal.aborted) return
      res.setHeader('Content-Type', output.contentType)
      res.setHeader('Content-Length', output.audio.length)
      res.setHeader('Cache-Control', 'no-store')
      console.log(`[tts] ${ttsProvider.id} → 200 (${Date.now() - start}ms)`)
      return res.send(output.audio)
    } catch (error) {
      if (abortController.signal.aborted) return
      console.error(`[tts] ${ttsProvider.id} → 502 (${Date.now() - start}ms) error=${JSON.stringify(errorMessage(error))}`)
      return res.status(502).json({ error: 'TTS_FAILED' })
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
    const thinkingEffort = resolveThinkingEffort(req.body?.thinkingEffort)
    const normalizedLevel = resolveLevel(level)
    if (!normalizedLevel) return res.status(400).json({ error: 'INVALID_LEVEL' })
    const normalizedScenario = scenarioInfo == null ? null : resolveScenario(scenarioInfo)
    if (scenarioInfo != null && !normalizedScenario) return res.status(400).json({ error: 'INVALID_SCENARIO' })

    const chatMessages = (messages as unknown[])
      .filter((m): m is { role: string; content: unknown } =>
        typeof m === 'object' && m !== null && 'role' in m)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .filter((m): m is { role: 'user' | 'assistant'; content: string } => typeof m.content === 'string' && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-cfg.maxContextMessages)

    if (messages.length > 0 && chatMessages.length === 0) {
      return res.status(400).json({ error: 'INVALID_MESSAGES' })
    }
    if (chatMessages.length === 0) {
      chatMessages.push({
        role: 'user',
        content: `Say hello and welcome me to practice English. Context: ${normalizedScenario?.name ?? 'General practice'}.`,
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
          levelPrompt: getLevelSystemPrompt(normalizedLevel),
          scenarioInfo: normalizedScenario,
          diversitySeed,
        }),
        temperature: 0.7,
        thinkingEffort,
        scenarioId: normalizedScenario?.id ?? 'free_chat',
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
    const normalizedUserMessage = optionalText(userMessage)
    const normalizedAssistantMessage = optionalText(assistantMessage)
    if (!normalizedUserMessage && !normalizedAssistantMessage) {
      return res.status(400).json({ error: 'userMessage or assistantMessage is required' })
    }
    const normalizedLevel = resolveLevel(level)
    if (!normalizedLevel) return res.status(400).json({ error: 'INVALID_LEVEL' })
    const model = resolveRequestedModel(req.body?.model, cfg.analyzeModel, cfg.availableModels)
    if (!model) return res.status(400).json({ error: 'MODEL_NOT_ALLOWED' })
    const thinkingEffort = resolveThinkingEffort(req.body?.thinkingEffort)
    const normalizedScenarioContext = optionalText(scenarioContext)
    try {
      const abortController = abortWhenClientDisconnects(req, res)
      const { data, isFallback } = await provider.analyzeJSON({
        userMessage: normalizedUserMessage ?? '',
        assistantMessage: normalizedAssistantMessage ?? '',
        level: normalizedLevel,
        model,
        thinkingEffort,
        scenarioContext: normalizedScenarioContext,
        signal: abortController.signal,
      })
      if (abortController.signal.aborted) return
      logRequest({ endpoint: 'analyze', provider: cfg.provider, model, status: 200, latencyMs: Date.now() - start, fallback: !!isFallback })
      res.json({ ...(typeof data === 'object' && data !== null ? data : {}), isFallback: !!isFallback })
    } catch (error) {
      if (req.aborted || res.destroyed) return
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
    const thinkingEffort = resolveThinkingEffort(req.body?.thinkingEffort)
    const level = resolveLevel(req.body?.level)
    if (!level) return res.status(400).json({ error: 'INVALID_LEVEL' })
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
            thinkingEffort,
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
    const fallbackCards = fallbackFillBlankCards(level, focus, diversitySeed)
    const fallbackIds = new Set(fallbackCards.map((card) => card.id))
    const cards = selectUniqueCards({
      generated,
      fallback: fallbackCards,
      count: rawCount,
      recentSentences,
    })
    if (focus !== 'mixed' && cards.some((card) => card.focusType !== focus)) {
      logRequest({ endpoint: 'fill-blank', provider: cfg.provider, model, status: 500, latencyMs: Date.now() - start, fallback: true })
      return res.status(500).json({ error: 'FILL_BLANK_FOCUS_MISMATCH' })
    }
    if (cards.length < rawCount) {
      logRequest({ endpoint: 'fill-blank', provider: cfg.provider, model, status: 503, latencyMs: Date.now() - start, fallback: true })
      return res.status(503).json({
        error: 'INSUFFICIENT_FILL_BLANK_CARDS',
        requestedCount: rawCount,
        availableCount: cards.length,
      })
    }
    const fallbackCount = cards.filter((card) => fallbackIds.has(card.id)).length
    if (fallbackCount > 0) isFallback = true
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
    const thinkingEffort = resolveThinkingEffort(req.body?.thinkingEffort)
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
          thinkingEffort,
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
      const activities = staticLearningActivities(lesson)
      logRequest({ endpoint: 'learning-practice', provider: cfg.provider, model, status: 200, latencyMs: Date.now() - start, retry: 1, fallback: true })
      return res.json({ activities, isFallback: true })
    } catch (error) {
      if (abortController.signal.aborted) return
      const activities = staticLearningActivities(lesson)
      logRequest({ endpoint: 'learning-practice', provider: cfg.provider, model, status: 200, latencyMs: Date.now() - start, fallback: true, errorMsg: errorMessage(error) })
      return res.json({ activities, isFallback: true })
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
    const thinkingEffort = resolveThinkingEffort(req.body?.thinkingEffort)
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
        systemInstruction: prompts.systemInstruction, temperature: 0.2, thinkingEffort, maxAttempts: 2,
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
    const normalizedQuestion = requiredText(question)
    if (!normalizedQuestion) {
      return res.status(400).json({ error: 'question is required' })
    }
    const normalizedLevel = resolveLevel(level)
    if (!normalizedLevel) return res.status(400).json({ error: 'INVALID_LEVEL' })
    const model = resolveRequestedModel(req.body?.model, cfg.chatModel, cfg.availableModels)
    if (!model) return res.status(400).json({ error: 'MODEL_NOT_ALLOWED' })
    const thinkingEffort = resolveThinkingEffort(req.body?.thinkingEffort)
    const contextRecord = isRecord(context) ? context : undefined
    const requestedSource = optionalText(contextRecord?.source)
    if (requestedSource && !ASK_CONTEXT_SOURCES.has(requestedSource)) {
      return res.status(400).json({ error: 'INVALID_ASK_CONTEXT_SOURCE' })
    }
    const requestedFocusType = optionalText(contextRecord?.focusType)
    if (requestedFocusType && !ASK_FOCUS_TYPES.has(requestedFocusType)) {
      return res.status(400).json({ error: 'INVALID_ASK_FOCUS_TYPE' })
    }
    const requestedLessonId = optionalText(contextRecord?.lessonId)
    const lesson = requestedLessonId ? LESSON_BY_ID.get(requestedLessonId) : undefined
    if (requestedLessonId && !lesson) {
      return res.status(400).json({ error: 'UNKNOWN_LEARNING_LESSON' })
    }
    const ctx =
      contextRecord
        ? {
            source: requestedSource as 'chat' | 'fill-blank' | 'learning' | undefined,
            sourceLabel: optionalText(contextRecord.sourceLabel),
            focusType: requestedFocusType as 'word' | 'sentence' | 'section' | undefined,
            focusText: optionalText(contextRecord.focusText),
            pageContent: optionalText(contextRecord.pageContent),
            lesson: lesson ? {
              title: lesson.title, objective: lesson.objective, examples: lesson.examples,
              explanation: lesson.explanation, rules: lesson.rules, contrasts: lesson.contrasts,
            } : undefined,
            activityPrompt: optionalText(contextRecord.activityPrompt),
            learnerAnswer: optionalText(contextRecord.learnerAnswer),
            feedback: optionalText(contextRecord.feedback),
          }
        : undefined
    const rawHistory: unknown[] = Array.isArray(req.body?.history) ? req.body.history : []
    const history = rawHistory
      .filter((item): item is { role: string; content: unknown } => typeof item === 'object' && item !== null && 'role' in item)
      .filter((item): item is { role: 'user' | 'assistant'; content: unknown } => item.role === 'user' || item.role === 'assistant')
      .filter((item): item is { role: 'user' | 'assistant'; content: string } => typeof item.content === 'string' && item.content.trim().length > 0)
      .map((item) => ({ role: item.role, content: item.content }))
      .slice(-cfg.maxContextMessages)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const abortController = abortWhenClientDisconnects(req, res)

    try {
      const result = await provider.chatStream({
        messages: [...history, { role: 'user', content: buildAskUserPrompt({ question: normalizedQuestion, context: ctx }) }],
        model,
        systemInstruction: composeAskSystemPrompt(normalizedLevel),
        temperature: 0.4,
        thinkingEffort,
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
