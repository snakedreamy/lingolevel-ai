// providers/schema.ts
// JSON Schema describing the analyze endpoint output shape.
// Used by OpenAI response_format.json_schema and Anthropic tools[].input_schema.

export const analysisJsonSchema = {
  type: 'object',
  properties: {
    translation: { type: 'string' },
    grammarCorrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          corrected: { type: 'string' },
          explanation: { type: 'string' },
          politeForm: { type: 'string' },
          score: { type: 'integer' }
        },
        required: ['original', 'corrected', 'explanation', 'score']
      }
    },
    assistantReplyInsight: {
      type: 'object',
      properties: {
        structure: { type: 'string' },
        grammar: { type: 'string' },
        whyThisReply: { type: 'string' }
      },
      required: ['structure', 'grammar', 'whyThisReply']
    },
    keyWords: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          phonetic: { type: 'string' },
          definition: { type: 'string' },
          exampleEn: { type: 'string' },
          exampleZh: { type: 'string' }
        },
        required: ['word', 'phonetic', 'definition', 'exampleEn', 'exampleZh']
      }
    },
    suggestions: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['translation', 'grammarCorrections', 'assistantReplyInsight', 'keyWords', 'suggestions']
} as const

export const analysisSystemPrompt = `
  You are an expert English-Chinese Bilingual Teacher. Analyze the latest exchange.
  Current learner level target: {LEVEL}.

  User sentence: "{USER}"
  AI response: "{ASSISTANT}"

  Tasks:
      1. **翻译 (translation)**: Provide a natural, idiomatic Chinese translation for BOTH the user's sentence and the AI's response.
         - The "translation" field MUST be a SINGLE string, NOT an object. Do NOT nest sub-fields.
         - Use exactly this format: "用户: [翻译]\nAI: [翻译]"
         - Example: 用户说了"I use a computer to program. I like dogs."，AI回复了"That is great! Do you code every day?"
           → "translation": "用户: 我用电脑编程。我喜欢狗。\nAI: 那太棒了！你每天都写代码吗？"
         - If the user's English has grammar mistakes, translate what they MEANT, not the literal errors.
         - Don't chatter, don't add explanations — just the two translations.
  2. Analyze the USER's sentence for grammar, phrasing, tense, and spelling.
     - Score the user sentence out of 100 on correctness.
     - Scoring rubric: 95-100 fully correct; 80-94 minor issues; 60-79 clear grammar mistakes; below 60 hard to understand.
     - Find spelling, grammar, preposition errors, or awkward expressions. Suggest a corrected version.
     - If you say a word is wrong (for example: you/your, tense, word order), the corrected sentence MUST actually fix it and MUST differ from the original sentence.
     - Explain specifically in simple Chinese.
     - Suggest a polite or more idiomatic native way of saying it.
  3. Analyze the ASSISTANT's reply for learning value.
     - assistantReplyInsight: every field MUST cite concrete content from the actual reply. Forbidden: empty labels like “后续问题”, “自然衔接”, or generic slogan-style praise.
     - Only write useful learning points. Avoid empty labels like “后续问题”, “自然衔接”, or generic slogan-style praise.
     - structure: explain in one Chinese sentence what the reply is doing in conversation, using concrete actions from the actual reply (for example: “先自我介绍，再把同一个问题回给对方”), not a bare tag list.
     - grammar: point out 1 concrete pattern from the actual reply. If the sentence is very simple, say it is mainly a basic greeting/question and tell the learner what they can directly reuse.
     - whyThisReply: explain the practical conversation purpose of this reply in the current context, not abstract praise.
  4. Extract 2 to 4 key vocabulary items or expressions from either sentence.
     - keyWords: only words/phrases actually present in this exchange and worth learning. Do NOT pad the list with near-duplicates. For low levels, prefer high-frequency words.
     - Prefer phrases or words that are actually worth learning for the user's level; avoid filling the list with multiple near-duplicate greeting words unless they are truly useful.
     - For each, provide IPA Phonetic Symbol, Chinese definition, English example sentence, and Chinese translation of that example.
  5. Suggest EXACTLY 3 natural options the user could say next, in this order:
     - suggestions: exactly 3, each distinct — (1) a safe direct answer to the assistant's last question, (2) a longer reply that expands the topic, (3) a follow-up question. All must fit the current scenario. Never empty.
     - suggestion 1: a safe/easy reply that directly answers the assistant's latest question or clearly接住对话
     - suggestion 2: a slightly longer reply that expands the topic
     - suggestion 3: a reply that asks a follow-up question and keeps the conversation going
     - Never return an empty list.
     Each MUST contain the full English phrase and its Chinese translation in brackets like: "Do you agree? [你同意吗？]".
{SCENARIO_LINE}
`

export function buildAnalysisUserPrompt(level: string, userMessage: string, assistantMessage: string, scenarioContext?: string): string {
  const scenarioLine = scenarioContext
    ? `\n  NOTE: This conversation is in the context of "${scenarioContext}". Ensure all suggestions and examples fit this scenario naturally.`
    : ''
  return analysisSystemPrompt
    .replace('{LEVEL}', level)
    .replace('{USER}', userMessage || '')
    .replace('{ASSISTANT}', assistantMessage || '')
    .replace('{SCENARIO_LINE}', scenarioLine)
}