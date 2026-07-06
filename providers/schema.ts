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
  1. Provide a beautiful Chinese translation for BOTH sentences.
  2. Analyze the USER's sentence for grammar, phrasing, tense, and spelling.
     - Score the user sentence out of 100 on correctness.
     - Find spelling, grammar, preposition errors, or awkward expressions. Suggest a corrected version.
     - Explain specifically in simple Chinese.
     - Suggest a polite or more idiomatic native way of saying it.
  3. Analyze the ASSISTANT's reply for learning value.
     - Describe the reply structure in simple Chinese (for example: correction + encouragement + follow-up question).
     - Explain the key grammar or sentence pattern used by the assistant.
     - Explain why this reply is natural or helpful in conversation, especially how it matches the current context.
  4. Extract 2 to 4 key vocabulary items or expressions from either sentence.
     - For each, provide IPA Phonetic Symbol, Chinese definition, English example sentence, and Chinese translation of that example.
  5. Suggest EXACTLY 3 natural options the user could say next, in this order:
     - suggestion 1: a safe/easy reply that simply接住对话
     - suggestion 2: a slightly longer reply that expands the topic
     - suggestion 3: a reply that asks a follow-up question and keeps the conversation going
     Each MUST contain the full English phrase and its Chinese translation in brackets like: "Do you agree? [你同意吗？]".
`

export function buildAnalysisUserPrompt(level: string, userMessage: string, assistantMessage: string): string {
  return analysisSystemPrompt
    .replace('{LEVEL}', level)
    .replace('{USER}', userMessage || '')
    .replace('{ASSISTANT}', assistantMessage || '')
}