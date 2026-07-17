import type { LucideIcon } from 'lucide-react'

export type DifficultyLevel = 'kindergarten' | 'primary_low' | 'primary_high' | 'junior' | 'senior' | 'college' | 'ielts';

export interface LevelConfig {
  id: DifficultyLevel;
  name: string; // 中文名
  englishName: string;
  description: string;
  ageGroup: string;
  vocabularyRange: string;
  promptGuideline: string;
}

export interface Scenario {
  id: string;
  name: string;
  englishName: string;
  icon: LucideIcon;
  description: string;
  starterMessages: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  translation?: string;
  pronunciation?: string; // IPA phonetics
  isFallback?: boolean;
  /** True while the assistant message is still being streamed token-by-token. */
  streaming?: boolean;
}

export interface AskContext {
  word?: string
  sentence?: string
  lessonId?: string
  lessonTitle?: string
  activityPrompt?: string
  learnerAnswer?: string
  feedback?: string
}

export interface AskMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  context?: AskContext
  streaming?: boolean
  isFallback?: boolean
}

export type FillBlankFocus = 'mixed' | 'vocabulary' | 'grammar'

export const FILL_BLANK_MIN_COUNT = 3
export const FILL_BLANK_MAX_COUNT = 20

export interface FillBlankBreakdownItem {
  /** Exact, consecutive words from the completed sentence. */
  text: string
  /** The job this chunk performs in this sentence, such as subject or predicate. */
  role: string
  /** Sentence-specific Chinese explanation of meaning and function. */
  explanation: string
}

export interface FillBlankImitationGuide {
  /** Concrete replacement steps that preserve the learned structure. */
  steps: string[]
  /** A new English sentence using the same pattern. */
  example: string
  translation: string
  /** A likely error and its correction. */
  caution: string
}

/** A single AI-generated cloze card. `sentence` contains exactly one {{blank}} marker. */
export interface FillBlankCard {
  id: string
  sentence: string
  translation: string
  answer: string
  phonetic: string
  partOfSpeech: string
  definition: string
  hint: string
  grammarPoint: string
  structure: string
  explanation: string
  focusType: Exclude<FillBlankFocus, 'mixed'>
  breakdown: FillBlankBreakdownItem[]
  imitation: FillBlankImitationGuide
}

export interface FillBlankProgress {
  input: string
  attempts: number
  status: 'answering' | 'correct' | 'revealed'
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string; // Explanations in Chinese
  politeForm?: string; // More native/idiomatic way to say it
  score: number; // 1-100 rating of the grammar quality
}

export interface AssistantReplyInsight {
  structure: string;
  grammar: string;
  whyThisReply: string;
}

export interface AnalysisResult {
  translation: string;
  grammarCorrections: GrammarCorrection[];
  assistantReplyInsight: AssistantReplyInsight;
  keyWords: {
    word: string;
    phonetic: string;
    definition: string;
    exampleEn: string;
    exampleZh: string;
  }[];
  suggestions: string[]; // Idiomatic prompt examples user can say next
  /** True when the server had to fall back to a conservative backup analysis. */
  isFallback?: boolean;
}

export interface AnalysisHistoryEntry {
  id: string;
  userMessageId?: string;
  assistantMessageId?: string;
  userMessage: string;
  assistantMessage: string;
  level?: DifficultyLevel;
  scenarioContext?: string;
  analysis: AnalysisResult;
  createdAt: number;
}

export type ProviderId = 'openai' | 'anthropic'

/**
 * Browser-side, non-sensitive preferences persisted in `localStorage`.
 *
 * These values are owned by the browser UI itself. Server-owned runtime config
 * such as provider/baseUrl and the allowed model list is fetched separately;
 * `modelId` only remembers the user's selection from that server-owned list.
 */
export interface BrowserPrefs {
  /** CEFR-like level picked by the user; drives the system prompt. */
  level: DifficultyLevel
  /** Scenario id from `src/data/scenarios.ts` (e.g. `free_chat`). */
  scenarioId: string
  /** UI theme preference. */
  theme: 'light' | 'dark'
  /** Empty means use each task's server-configured default model. */
  modelId: string
  /**
   * When true, the chat input only sends on Ctrl/Cmd+Enter; a bare Enter
   * inserts a newline. Helps users who keep sending half-finished messages.
   */
  sendOnCtrlEnter: boolean
}

/**
 * Storage key for `BrowserPrefs` in `window.localStorage`.
 *
 * The `lingolevel_` prefix avoids collisions with other apps hosted on the
 * same origin.
 */
export const BROWSER_PREFS_KEY = 'lingolevel_prefs'

export const DEFAULT_BROWSER_PREFS: Readonly<BrowserPrefs> = {
  level: 'junior',
  scenarioId: 'free_chat',
  theme: 'light',
  modelId: '',
  sendOnCtrlEnter: false
}
