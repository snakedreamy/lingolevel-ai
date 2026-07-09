import type { AnalysisResult } from '../src/types'

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
    const corrected = resolveCorrectedSentence(
      pickString(g, ['correctedVersion', 'corrected', 'correction']),
      userMessage,
      deriveCorrectedSentenceFromExplanation(userMessage, combinedExplanation) ??
        deriveCorrectedSentenceFromAssistantReply(userMessage, assistantMessage, score)
    )
    const politeForm = resolvePoliteForm(
      pickString(g, ['nativeSuggestion', 'politeForm', 'native', 'idiomatic']),
      userMessage,
      corrected
    )
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
  const corrected = resolveCorrectedSentence(
    pickString(g, ['corrected', 'correction']),
    fallbackOriginal,
    deriveCorrectedSentenceFromExplanation(fallbackOriginal, explanation) ??
      deriveCorrectedSentenceFromAssistantReply(fallbackOriginal, assistantMessage, score)
  )

  return {
    original: pickString(g, ['original']) ?? fallbackOriginal,
    corrected,
    explanation,
    politeForm: resolvePoliteForm(
      pickString(g, ['politeForm', 'nativeSuggestion', 'native', 'idiomatic']),
      fallbackOriginal,
      corrected
    ),
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
  const resolvedGrammar = shouldUseDerivedGrammarInsight(grammar)
    ? derived.grammar
    : (grammar ?? derived.grammar)
  const resolvedWhyThisReply = shouldUseDerivedNextStepInsight(whyThisReply)
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

function resolveCorrectedSentence(
  candidate: string | undefined,
  original: string,
  fallback: string | undefined
): string {
  if (candidate && candidate.trim() && candidate.trim() !== original.trim()) {
    return candidate.trim()
  }

  if (fallback && fallback.trim() && fallback.trim() !== original.trim()) {
    return fallback.trim()
  }

  return original
}

function resolvePoliteForm(
  candidate: string | undefined,
  original: string,
  corrected: string
): string {
  if (candidate && candidate.trim() && candidate.trim() !== original.trim()) {
    return candidate.trim()
  }

  return corrected
}

function deriveCorrectedSentenceFromExplanation(userMessage: string, explanation: string): string | undefined {
  const normalizedUser = userMessage.trim()
  if (!normalizedUser) return undefined

  const cueCandidates = Array.from(
    explanation.matchAll(/(?:should be|should say|correct(?:ed)? sentence is|correct(?:ed)? form is|正确写法是|正确(?:的)?句子是|正确说法是|应该是|通常说)\s*["“'']?([^"”'。!！?？\n]+)["”'']?/gi),
    (match) => match[1]?.trim() ?? ''
  ).filter((candidate) => looksLikeFullEnglishSentence(candidate, normalizedUser))

  const quotedSegments = Array.from(
    explanation.matchAll(/["“'']([A-Za-z][^"”'']{0,80})["”'']/g),
    (match) => match[1]?.trim() ?? ''
  ).filter((segment) => segment.length > 0)

  const quotedSentenceCandidates = quotedSegments.filter((candidate) => looksLikeFullEnglishSentence(candidate, normalizedUser))
  const allSentenceCandidates = dedupeInsights([...cueCandidates, ...quotedSentenceCandidates])
  const bestSentenceCandidate = pickBestSentenceCandidate(normalizedUser, allSentenceCandidates)
  if (bestSentenceCandidate) {
    return bestSentenceCandidate
  }

  const correctionPair = deriveCorrectionPairFromExplanation(explanation)
  if (correctionPair) {
    const replaced = replaceFragmentInSentence(normalizedUser, correctionPair.wrong, correctionPair.correct)
    if (replaced && replaced !== normalizedUser) {
      return replaced
    }
  }

  for (let index = 0; index < quotedSegments.length - 1; index += 1) {
    const source = quotedSegments[index]
    const target = quotedSegments[index + 1]
    const replaced = replaceFragmentInSentence(normalizedUser, source, target)
    if (replaced && replaced !== normalizedUser) {
      return replaced
    }
  }

  return undefined
}

function looksLikeFullEnglishSentence(candidate: string, original: string): boolean {
  const trimmed = candidate.trim()
  if (!trimmed) return false
  if (trimmed === original.trim()) return false
  if (!/[A-Za-z]/.test(trimmed)) return false
  return trimmed.split(/\s+/).length >= 2
}

function pickBestSentenceCandidate(original: string, candidates: string[]): string | undefined {
  const normalizedOriginal = original.trim().toLowerCase()
  const normalizedTokens = new Set(normalizedOriginal.split(/\s+/))

  let bestCandidate: string | undefined
  let bestScore = 0

  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    const lower = trimmed.toLowerCase()
    if (lower === normalizedOriginal) continue

    const tokens = lower.split(/\s+/)
    let score = 0
    for (const token of tokens) {
      if (normalizedTokens.has(token)) {
        score += 1
      }
    }
    if (tokens.length >= 3) {
      score += 1
    }
    if (/[?!.]$/.test(trimmed)) {
      score += 1
    }

    if (score > bestScore) {
      bestScore = score
      bestCandidate = trimmed
    }
  }

  return bestScore >= 3 ? bestCandidate : undefined
}

function deriveCorrectionPairFromExplanation(explanation: string): { wrong: string; correct: string } | undefined {
  const patterns = [
    /["“'']([A-Za-z]+)["”'']\s*应(?:该)?改为(?:所有格)?\s*["“'']([A-Za-z]+)["”'']/i,
    /把\s*["“'']([A-Za-z]+)["”'']\s*改成\s*["“'']([A-Za-z]+)["”'']/i,
    /["“'']([A-Za-z]+)["”'']\s*应该是\s*["“'']([A-Za-z]+)["”'']/i,
  ]

  for (const pattern of patterns) {
    const match = explanation.match(pattern)
    if (!match) continue
    const wrong = match[1]?.trim()
    const correct = match[2]?.trim()
    if (wrong && correct && wrong !== correct) {
      return { wrong, correct }
    }
  }

  return undefined
}

function replaceFragmentInSentence(sentence: string, source: string, target: string): string | undefined {
  const sourceTrimmed = source.trim()
  const targetTrimmed = target.trim()
  if (!sourceTrimmed || !targetTrimmed) return undefined
  if (sourceTrimmed === targetTrimmed) return undefined

  const escaped = sourceTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`\\b${escaped}\\b`, 'i')
  if (!pattern.test(sentence)) return undefined

  const replaced = sentence.replace(pattern, targetTrimmed)
  return replaced.trim()
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

  const correctionCue = /(?:i think you mean|we usually say|it should be|you should say|the correct sentence is|the correct form is)\s*[:：-]?\s*["“]([^"”]+)["”]/gi
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

function shouldUseDerivedGrammarInsight(value: string | undefined): value is undefined {
  if (shouldUseDerivedInsight(value)) return true
  if (!value) return true

  const trimmed = value.trim()
  return trimmed.length < 10 || /自然衔接|从句关系|句子之间/.test(trimmed)
}

function shouldUseDerivedNextStepInsight(value: string | undefined): value is undefined {
  if (shouldUseDerivedInsight(value)) return true
  if (!value) return true

  const trimmed = value.trim()
  return trimmed.length < 18 || /更自然|帮助对话继续|继续往前推进|降低学习者的紧张感|自然延续|建立初次对话的友好氛围|保持对话开放性/.test(trimmed)
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
  const quotedCorrection = extractReusableQuotedSentence(assistantMessage)
  const directReusableQuestion = extractDirectReusableQuestion(assistantMessage)

  let structure = '它先顺着当前话题往下接，并给了你一条最容易继续说下去的路。'

  if (hasCorrection && hasPositiveFeedback && hasFollowUpQuestion) {
    structure = '它先顺手把你上一句改对，再补一句鼓励，然后马上给你一个可以继续回答的问题。'
  } else if (hasCorrection && hasFollowUpQuestion) {
    structure = '它先把你刚才那句换成更正确的说法，再顺势把同一话题继续问下去。'
  } else if (hasPositiveFeedback && hasFollowUpQuestion && hasSelfDisclosure) {
    structure = '它先接住你的话，再给一点自己的信息，最后抛出一个具体问题让你继续说。'
  } else if (hasPositiveFeedback && hasFollowUpQuestion) {
    structure = '它先回应你的上一句，再问一个你可以直接接下去的小问题。'
  } else if (hasFollowUpQuestion && hasSelfDisclosure) {
    structure = '它先补一点自己的信息，再把问题抛回给你，所以你比较容易继续接话。'
  } else if (hasFollowUpQuestion && hasSpecificQuestion) {
    structure = '它没有展开很多解释，而是直接给了一个具体问题，方便你马上回答。'
  }

  const reusablePatterns: string[] = []
  if (quotedCorrection) {
    reusablePatterns.push(`先直接套用更正句 ${quotedCorrection}`)
  }
  if (directReusableQuestion) {
    reusablePatterns.push(`直接复用问句 ${directReusableQuestion}`)
  }
  if (lower.includes('my name is')) {
    reusablePatterns.push('直接套用 My name is ... 做自我介绍')
  }
  if (lower.includes('do you like')) {
    reusablePatterns.push('直接套用 Do you like ...? 继续问对方喜好')
  }
  if (lower.includes('what is your name')) {
    reusablePatterns.push('直接套用 What is your name? 继续认识对方')
  }
  if (lower.includes('how old are you')) {
    reusablePatterns.push('直接套用 How old are you? 继续基础问答')
  }
  if (lower.includes('what is your favorite')) {
    reusablePatterns.push('直接套用 What is your favorite ...? 把话题往偏好上引')
  }
  if (lower.includes('did you')) {
    reusablePatterns.push('直接模仿 Did you ...? 这种过去时提问')
  }
  if (lower.includes("i'm ") || lower.includes("that's ") || lower.includes("what's ")) {
    reusablePatterns.push('顺手留意 I’m / That’s / What’s 这类缩略形式')
  }

  const grammar = reusablePatterns.length > 0
    ? dedupeInsights(reusablePatterns).slice(0, 2).join('；')
    : hasFollowUpQuestion
      ? '这句主要是基础问句或短回答，先整句模仿，再替换里面一个词继续说就够了。'
      : '这句更适合整句跟读一遍，再把其中一个时间、人物或地点换成你自己的内容。'

  let whyThisReply = '先看懂它下一步想聊什么，再直接借用里面的句型接话。'
  if (hasCorrection && quotedCorrection) {
    whyThisReply = `你下一句最容易先借用 ${quotedCorrection} 这个正确说法，再继续回答它后面的提问。`
  } else if (directReusableQuestion) {
    whyThisReply = `如果你一时不知道怎么说，先围绕 ${directReusableQuestion} 这个问题给一句最短回答就行。`
  } else if (hasFollowUpQuestion) {
    whyThisReply = '它已经把问题递到你手里了，你只要先用一句最短答案接住，再补一点细节就能继续。'
  }

  return {
    structure,
    grammar,
    whyThisReply,
  }
}

function extractReusableQuotedSentence(text: string): string | undefined {
  const matches = Array.from(text.matchAll(/["“]([^"”]+)["”]/g), (match) => match[1]?.trim() ?? '').filter((candidate) => {
    if (!candidate) return false
    if (!/[A-Za-z]/.test(candidate)) return false
    return candidate.split(/\s+/).length >= 2
  })

  return matches[0]
}

function extractDirectReusableQuestion(text: string): string | undefined {
  const sentences = text
    .split(/(?<=[?.!])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
  const question = sentences.find((item) => item.includes('?'))
  return question && /[A-Za-z]/.test(question) ? question : undefined
}

function dedupeInsights(items: string[]) {
  return items.filter((item, index) => items.indexOf(item) === index)
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
