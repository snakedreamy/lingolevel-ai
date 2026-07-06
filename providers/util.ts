import type { AnalysisResult } from '../src/types'

export const JSON_EXTRACT_HINT = '\n\nIMPORTANT: Return ONLY a valid JSON object. No markdown code blocks, no commentary, no prefix. Just the raw JSON starting with { and ending with }.'

/**
 * Safely convert an unknown error into a human-readable string.
 * Prefers Error.message; falls back to String(err); guards against
 * pathological cases where String(err) itself throws.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  try {
    return String(err)
  } catch {
    return 'Unknown error (failed to stringify)'
  }
}

/**
 * Heuristic: does this text look like an HTML/error page or a transport-layer
 * failure payload instead of a real model response?
 */
export function looksLikeErrorContent(text: string): boolean {
  const head = text.slice(0, 256).trimStart()
  if (head.length === 0) return true

  const lower = head.toLowerCase()
  return (
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
  )
}

/**
 * Heuristically pull a JSON object out of a (possibly noisy) model reply.
 *
 * Why this exists: many third-party "transit" relays
 * do NOT enforce `response_format: json_schema` server-side — they pass the
 * schema text to the model as a hint, and the model often wraps the JSON in
 * a ```json ... ``` fence or adds a stray leading sentence. This helper does a
 * best-effort parse so we can still extract structured data without depending
 * on protocol-enforced JSON.
 *
 * Strategy, in order:
 *   1. Find the FIRST '{' and the matching closing '}' (handles nesting).
 *   2. If that fails, look for a fenced ```json ... ``` or ``` ... ``` block.
 *   3. If neither yields valid JSON, throw — caller (callWithRetry) will
 *      retry, and on final failure the adapter returns the fallback.
 *
 * @throws Error when no candidate string parses as JSON.
 */
export function extractJsonObject(text: string): string {
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('extractJsonObject: input is empty')
  }

  // 1) Brace-balanced scan: find first '{' and its matching '}'.
  const firstBrace = text.indexOf('{')
  if (firstBrace !== -1) {
    let depth = 0
    let inString = false
    let escape = false
    for (let i = firstBrace; i < text.length; i++) {
      const ch = text[i]
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const candidate = text.slice(firstBrace, i + 1)
          // Quick sanity check: must parse. If not, fall through to fence scan.
          try {
            JSON.parse(candidate)
            return candidate
          } catch {
            break
          }
        }
      }
    }
  }

  // 2) Fenced code block: ```json ... ``` or ``` ... ```
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/i
  const fenceMatch = fenceRe.exec(text)
  if (fenceMatch && typeof fenceMatch[1] === 'string') {
    const candidate = fenceMatch[1].trim()
    try {
      JSON.parse(candidate)
      return candidate
    } catch {
      // fall through
    }
  }

  throw new Error('extractJsonObject: no parseable JSON object found in model output')
}

/**
 * Normalize a model-returned analysis object into the documented `AnalysisResult`
 * shape, tolerating common field-name and structural deviations.
 */
export function normalizeAnalysisShape(
  raw: unknown,
  userMessage: string,
  assistantMessage: string
): { data: AnalysisResult; coerced: boolean } {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('normalizeAnalysisShape: input is not an object')
  }
  const r = raw as Record<string, unknown>
  let coerced = false

  let translation: string
  if (typeof r.translation === 'string') {
    translation = r.translation
  } else if (typeof r.translation === 'object' && r.translation !== null) {
    coerced = true
    const t = r.translation as Record<string, unknown>
    const userPart =
      pickString(t, ['userSentence', 'user', 'userText', 'userTranslation']) ??
      userMessage
    const aiPart =
      pickString(t, ['aiResponse', 'ai', 'assistantResponse', 'assistant', 'assistantText', 'aiTranslation']) ??
      assistantMessage
    translation = `User: ${userPart}\nAI: ${aiPart}`
  } else {
    coerced = true
    translation = assistantMessage
      ? `User: ${userMessage}\nAI: ${assistantMessage}`
      : userMessage || ''
  }

  let grammarCorrections: AnalysisResult['grammarCorrections']
  if (Array.isArray(r.grammarCorrections)) {
    grammarCorrections = (r.grammarCorrections as unknown[]).map((item) =>
      normalizeGrammarCorrection(item, userMessage, assistantMessage)
    )
  } else if (typeof r.grammarCorrections === 'object' && r.grammarCorrections !== null) {
    coerced = true
    const g = r.grammarCorrections as Record<string, unknown>
    const explanationsRaw = g.explanations
    const errorsRaw = g.errors
    const explanationParts: string[] = []
    if (Array.isArray(explanationsRaw)) {
      for (const e of explanationsRaw) if (typeof e === 'string') explanationParts.push(e)
    }
    if (Array.isArray(errorsRaw)) {
      for (const e of errorsRaw) {
        if (typeof e === 'string') explanationParts.push(e)
        else if (typeof e === 'object' && e !== null) {
          const obj = e as Record<string, unknown>
          const detail = pickString(obj, ['detail', 'message', 'explanation'])
          const type = pickString(obj, ['type'])
          explanationParts.push(type && detail ? `${type}: ${detail}` : (detail ?? type ?? ''))
        }
      }
    }
    if (explanationParts.length === 0) {
      const single = pickString(g, ['explanation', 'detail'])
      if (single) explanationParts.push(single)
    }
    const scoreRaw = g.score
    const score =
      typeof scoreRaw === 'number' && Number.isFinite(scoreRaw)
        ? scoreRaw
        : Number(scoreRaw) || 60
    const combinedExplanation = explanationParts.join('；') || 'No specific issues found.'
    const corrected =
      pickString(g, ['correctedVersion', 'corrected', 'correction']) ??
      deriveCorrectedSentenceFromExplanation(userMessage, combinedExplanation) ??
      deriveCorrectedSentenceFromAssistantReply(userMessage, assistantMessage, score) ??
      userMessage
    const politeForm = pickString(g, ['nativeSuggestion', 'politeForm', 'native', 'idiomatic']) ?? corrected
    grammarCorrections = [
      {
        original: pickString(g, ['original']) ?? userMessage,
        corrected,
        explanation: combinedExplanation,
        politeForm,
        score
      }
    ]
  } else {
    coerced = true
    grammarCorrections = [
      {
        original: userMessage,
        corrected: userMessage,
        explanation: 'No specific issues found.',
        politeForm: userMessage,
        score: 80
      }
    ]
  }

  let assistantReplyInsight: AnalysisResult['assistantReplyInsight']
  if (typeof r.assistantReplyInsight === 'object' && r.assistantReplyInsight !== null) {
    const normalizedInsight = normalizeAssistantReplyInsight(r.assistantReplyInsight, assistantMessage)
    assistantReplyInsight = normalizedInsight.data
    if (normalizedInsight.coerced) {
      coerced = true
    }
  } else {
    coerced = true
    assistantReplyInsight = deriveAssistantReplyInsightFromMessage(assistantMessage)
  }

  let keyWords: AnalysisResult['keyWords']
  if (Array.isArray(r.keyWords)) {
    keyWords = (r.keyWords as unknown[]).map((item) => normalizeKeyWord(item))
  } else {
    coerced = true
    keyWords = []
  }

  let suggestions: string[]
  if (Array.isArray(r.suggestions)) {
    suggestions = (r.suggestions as unknown[])
      .map((s) => (typeof s === 'string' ? s : ''))
      .filter((s) => s.length > 0)
  } else {
    coerced = true
    suggestions = []
  }

  return {
    data: { translation, grammarCorrections, assistantReplyInsight, keyWords, suggestions },
    coerced
  }
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return undefined
}

function normalizeGrammarCorrection(
  item: unknown,
  fallbackOriginal: string,
  assistantMessage: string
): AnalysisResult['grammarCorrections'][number] {
  if (typeof item !== 'object' || item === null) {
    return {
      original: fallbackOriginal,
      corrected: fallbackOriginal,
      explanation: '',
      politeForm: fallbackOriginal,
      score: 80
    }
  }
  const g = item as Record<string, unknown>
  const explanation = pickString(g, ['explanation', 'detail', 'note']) ?? ''
  const score =
    typeof g.score === 'number' && Number.isFinite(g.score)
      ? g.score
      : Number(g.score) || 80
  const corrected =
    pickString(g, ['corrected', 'correction']) ??
    deriveCorrectedSentenceFromExplanation(fallbackOriginal, explanation) ??
    deriveCorrectedSentenceFromAssistantReply(fallbackOriginal, assistantMessage, score) ??
    fallbackOriginal

  return {
    original: pickString(g, ['original']) ?? fallbackOriginal,
    corrected,
    explanation,
    politeForm: pickString(g, ['politeForm', 'nativeSuggestion', 'native', 'idiomatic']) ?? corrected,
    score
  }
}

function normalizeAssistantReplyInsight(
  value: unknown,
  assistantMessage: string
): { data: AnalysisResult['assistantReplyInsight']; coerced: boolean } {
  const derived = deriveAssistantReplyInsightFromMessage(assistantMessage)

  if (typeof value !== 'object' || value === null) {
    return { data: derived, coerced: true }
  }

  const item = value as Record<string, unknown>
  const structure = pickString(item, ['structure', 'replyStructure', 'pattern'])
  const grammar = pickString(item, ['grammar', 'grammarPoint', 'sentencePattern'])
  const whyThisReply = pickString(item, ['whyThisReply', 'whyNatural', 'conversationPurpose'])

  const resolvedStructure = shouldUseDerivedStructure(structure, derived.structure)
    ? derived.structure
    : (structure ?? derived.structure)
  const resolvedGrammar = shouldUseDerivedInsight(grammar) ? derived.grammar : (grammar ?? derived.grammar)
  const resolvedWhyThisReply = shouldUseDerivedInsight(whyThisReply)
    ? derived.whyThisReply
    : (whyThisReply ?? derived.whyThisReply)

  return {
    data: {
      structure: resolvedStructure,
      grammar: resolvedGrammar,
      whyThisReply: resolvedWhyThisReply,
    },
    coerced:
      resolvedStructure !== structure ||
      resolvedGrammar !== grammar ||
      resolvedWhyThisReply !== whyThisReply,
  }
}

function deriveCorrectedSentenceFromExplanation(userMessage: string, explanation: string): string | undefined {
  const normalizedUser = userMessage.trim()
  if (!normalizedUser) return undefined

  const candidates = Array.from(
    explanation.matchAll(/\b(?:should be|should say|correct(?:ed)? sentence is|correct(?:ed)? form is)\s*["“]?([^"”.。!！?？\n]+)["”]?/gi),
    (match) => match[1]?.trim() ?? ''
  ).filter((candidate) => {
    if (!candidate) return false
    if (candidate === normalizedUser) return false
    if (!/[A-Za-z]/.test(candidate)) return false
    return candidate.split(/\s+/).length >= 3
  })

  if (candidates.length !== 1) {
    return undefined
  }

  return candidates[0]
}

function deriveCorrectedSentenceFromAssistantReply(
  userMessage: string,
  assistantMessage: string,
  score: unknown
): string | undefined {
  const numericScore = typeof score === 'number' ? score : Number(score)
  if (Number.isFinite(numericScore) && numericScore >= 90) {
    return undefined
  }

  const correctionCue = /(?:i think you mean|it should be|you should say|the correct sentence is|the correct form is)\s*[:：-]?\s*["“]([^"”]+)["”]/gi
  const matches = Array.from(assistantMessage.matchAll(correctionCue), (match) => match[1]?.trim() ?? '').filter((candidate) => {
    if (!candidate) return false
    if (candidate === userMessage) return false
    if (!/[A-Za-z]/.test(candidate)) return false
    return candidate.split(/\s+/).length >= 3
  })

  if (matches.length !== 1) {
    return undefined
  }

  return matches[0]
}

function shouldUseDerivedInsight(value: string | undefined): value is undefined {
  if (!value) return true

  return [
    '这句回复用于承接当前对话并继续推进话题。',
    '可关注其中的常见时态、问句结构和连接方式。',
    '它先回应上文，再主动给出可继续交流的内容，所以读起来更自然。',
  ].includes(value)
}

function looksLikeQuestionWord(text: string, word: string) {
  return new RegExp(`\\b${word}\\b`, 'i').test(text)
}

function shouldUseDerivedStructure(value: string | undefined, derived: string): boolean {
  if (shouldUseDerivedInsight(value)) return true
  if (!value) return true

  const trimmed = value.trim()
  if (trimmed === '最后用追问把话题继续往下推进。') return true

  return trimmed === derived
}

function deriveAssistantReplyInsightFromMessage(assistantMessage: string): AnalysisResult['assistantReplyInsight'] {
  const lower = assistantMessage.toLowerCase()
  const hasCorrection =
    lower.includes('i think you mean') ||
    lower.includes('it should be') ||
    lower.includes('we say') ||
    lower.includes('past form') ||
    lower.includes('correct')
  const hasPositiveFeedback =
    lower.includes("i'm glad") ||
    lower.includes('im glad') ||
    lower.includes('glad to hear') ||
    lower.includes("that's great") ||
    lower.includes('that is great') ||
    lower.includes('good to hear') ||
    lower.includes('sounds great') ||
    lower.includes('sounds good') ||
    lower.includes('well done') ||
    lower.includes('nice work') ||
    lower.includes('nice job')
  const hasFollowUpQuestion = assistantMessage.includes('?')
  const hasSpecificQuestion = [
    'what',
    'how',
    'why',
    'when',
    'where',
    'which',
    'who',
    'do',
    'did',
    'are',
    'is',
    'can',
    'could',
    'would',
    'have',
    'has',
    'was',
    'were',
  ].some((word) => looksLikeQuestionWord(assistantMessage, word))
  const hasSelfDisclosure =
    lower.includes('i really enjoy') ||
    lower.includes('i enjoy ') ||
    lower.includes('i like ') ||
    lower.includes("i'm into") ||
    lower.includes('for example') ||
    lower.includes('like science') ||
    lower.includes('like history')

  let structure = '这句回复通常会先回应上文，再补充信息或继续推进对话。'

  if (hasCorrection && hasPositiveFeedback && hasFollowUpQuestion) {
    structure = '先点出更自然的说法，再补一句鼓励，最后用追问把话题继续往下推进。'
  } else if (hasCorrection && hasFollowUpQuestion) {
    structure = '先纠正上一句里更自然的表达，再顺势追问，把对话继续往下推进。'
  } else if (hasPositiveFeedback && hasFollowUpQuestion && hasSelfDisclosure) {
    structure = '先回应你的上一句并给出正向反馈，再抛出一个具体问题，最后补一点自己的信息让语气更自然。'
  } else if (hasPositiveFeedback && hasFollowUpQuestion) {
    structure = '先回应你的上一句并给出正向反馈，再抛出一个具体问题邀请你继续展开。'
  } else if (hasFollowUpQuestion && hasSelfDisclosure) {
    structure = '先顺着当前话题抛出问题，再补一点自己的信息，让对话不只是在盘问。'
  } else if (hasFollowUpQuestion && hasSpecificQuestion) {
    structure = '先顺着当前话题提出一个具体问题，方便你直接接下一句。'
  } else if (hasFollowUpQuestion) {
    structure = '最后用追问把话题继续往下推进。'
  }

  const grammarParts: string[] = []
  if (lower.includes('yesterday') || lower.includes('went') || lower.includes('did ')) {
    grammarParts.push('过去时')
  }
  if (lower.includes('past form')) {
    grammarParts.push('过去式说明')
  }
  if (lower.includes('if ')) {
    grammarParts.push('if 条件句')
  }
  if (hasFollowUpQuestion) {
    grammarParts.push('问句结构')
  }
  if (lower.includes('have you ever')) {
    grammarParts.push('have you ever 这类现在完成时提问')
  }
  if (lower.includes("i'm ") || lower.includes("what's ") || lower.includes("that's ") || lower.includes("it's ")) {
    grammarParts.push('缩略形式')
  }
  if (lower.includes('enjoy ') || lower.includes('like ')) {
    grammarParts.push('常见动词搭配')
  }

  const uniqueGrammarParts = [...new Set(grammarParts)]

  let whyThisReply = '它先承接当前语境，再补充反馈或信息，因此读起来会更自然。'
  if (hasCorrection && hasFollowUpQuestion) {
    whyThisReply = '它把纠正、鼓励和继续练习放在同一轮回复里，所以既不会打断交流，也方便你马上模仿下一句。'
  } else if (hasPositiveFeedback && hasFollowUpQuestion && hasSelfDisclosure) {
    whyThisReply = '它先肯定你的表达，再给出一个具体问题，还顺手补了一点自己的信息，因此更像真实对话。'
  } else if (hasPositiveFeedback && hasFollowUpQuestion) {
    whyThisReply = '它先肯定你的表达，再给出一个容易接的话题，所以对话会更轻松，也更容易继续。'
  } else if (hasFollowUpQuestion) {
    whyThisReply = '它先承接你刚才的意思，再用提问把对话继续往前推进，所以既自然也方便你接下一句。'
  }

  return {
    structure,
    grammar:
      uniqueGrammarParts.length > 0
        ? `可重点观察其中的 ${uniqueGrammarParts.join('、')}，以及句子之间如何自然衔接。`
        : '可重点观察其中的时态、问句结构，以及句子之间如何自然衔接。',
    whyThisReply,
  }
}

function normalizeKeyWord(item: unknown): AnalysisResult['keyWords'][number] {
  if (typeof item !== 'object' || item === null) {
    return { word: '', phonetic: '', definition: '', exampleEn: '', exampleZh: '' }
  }
  const k = item as Record<string, unknown>
  return {
    word: pickString(k, ['word', 'term', 'vocabulary']) ?? '',
    phonetic: pickString(k, ['phonetic', 'ipa', 'pronunciation']) ?? '',
    definition: pickString(k, ['definition', 'chineseDefinition', 'translation', 'meaning', 'chineseMeaning']) ?? '',
    exampleEn: pickString(k, ['exampleEn', 'example', 'exampleSentence', 'englishExample']) ?? '',
    exampleZh: pickString(k, ['exampleZh', 'exampleTranslation', 'chineseExample', 'chineseExampleTranslation', 'exampleCn']) ?? ''
  }
}
