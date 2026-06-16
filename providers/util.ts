// providers/util.ts
import type { AnalysisResult } from '../src/types'

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
 * shape, tolerating common field-name and structural deviations:
 *
 *   - `translation`: may be a string OR an object like
 *     `{ userSentence, aiResponse }` / `{ user, assistant }` /
 *     `{ user, ai }`. Flatten those into a single string.
 *   - `grammarCorrections`: may be an array, OR an object with
 *     `{ score, errors, correctedVersion, explanations, nativeSuggestion }`.
 *     Coerce into a single-element `GrammarCorrection[]`.
 *   - `keyWords[i]`: may use `definition` / `phonetic` (schema) OR
 *     `chineseDefinition` / `phonetic` / `translation` / `pastTense` etc.
 *     Map whatever fields exist to the schema; pass through any string fields
 *     verbatim.
 *   - `suggestions`: usually a string[] — pass through as-is.
 *
 * Returns a fully-typed `AnalysisResult` and a boolean indicating whether
 * any field had to be coerced (used for debug logging).
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

  // ---- translation: string or {userSentence/aiResponse/user/ai/...} ----
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

  // ---- grammarCorrections: array OR object form ----
  let grammarCorrections: AnalysisResult['grammarCorrections']
  if (Array.isArray(r.grammarCorrections)) {
    grammarCorrections = (r.grammarCorrections as unknown[]).map((item) =>
      normalizeGrammarCorrection(item, userMessage)
    )
  } else if (typeof r.grammarCorrections === 'object' && r.grammarCorrections !== null) {
    coerced = true
    const g = r.grammarCorrections as Record<string, unknown>
    const corrected = pickString(g, ['correctedVersion', 'corrected', 'correction']) ?? userMessage
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
    const politeForm = pickString(g, ['nativeSuggestion', 'politeForm', 'native', 'idiomatic']) ?? corrected
    grammarCorrections = [
      {
        original: pickString(g, ['original']) ?? userMessage,
        corrected,
        explanation: explanationParts.join('；') || 'No specific issues found.',
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

  // ---- keyWords: array of objects, accept field-name variations ----
  let keyWords: AnalysisResult['keyWords']
  if (Array.isArray(r.keyWords)) {
    keyWords = (r.keyWords as unknown[]).map((item) =>
      normalizeKeyWord(item)
    )
  } else {
    coerced = true
    keyWords = []
  }

  // ---- suggestions: array of strings (tolerate non-strings) ----
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
    data: { translation, grammarCorrections, keyWords, suggestions },
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
  fallbackOriginal: string
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
  return {
    original: pickString(g, ['original']) ?? fallbackOriginal,
    corrected: pickString(g, ['corrected', 'correction']) ?? fallbackOriginal,
    explanation: pickString(g, ['explanation', 'detail', 'note']) ?? '',
    politeForm: pickString(g, ['politeForm', 'nativeSuggestion', 'native', 'idiomatic']) ?? pickString(g, ['corrected']) ?? fallbackOriginal,
    score:
      typeof g.score === 'number' && Number.isFinite(g.score)
        ? g.score
        : Number(g.score) || 80
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
