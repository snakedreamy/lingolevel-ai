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
  icon: string;
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

export interface WordItem {
  word: string;
  phonetic: string;
  translation: string;
  exampleEn: string;
  exampleZh: string;
  addTime: number;
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
  userMessage: string;
  assistantMessage: string;
  analysis: AnalysisResult;
  createdAt: number;
}

export type ProviderId = 'openai' | 'anthropic'

/**
 * Browser-side, non-sensitive preferences persisted in `localStorage`.
 *
 * These values are owned by the browser UI itself: theme, selected level and
 * selected scenario. Server-owned runtime config such as provider/model/baseUrl
 * is fetched separately from `/api/server-config` and must never be merged into
 * this object, otherwise the settings flow becomes harder to reason about.
 */
export interface BrowserPrefs {
  /** CEFR-like level picked by the user; drives the system prompt. */
  level: DifficultyLevel
  /** Scenario id from `src/data/scenarios.ts` (e.g. `free_chat`). */
  scenarioId: string
  /** UI theme preference. */
  theme: 'light' | 'dark'
}

/**
 * Storage key for `BrowserPrefs` in `window.localStorage`.
 *
 * Why not just `prefs`? An older, unrelated key named
 * `english_coach_wordbook` already lives in localStorage and we want to
 * make any future cleanup of legacy keys obvious. The `lingolevel_` prefix
 * also avoids collisions with other apps hosted on the same origin.
 */
export const BROWSER_PREFS_KEY = 'lingolevel_prefs'

export const DEFAULT_BROWSER_PREFS: Readonly<BrowserPrefs> = {
  level: 'junior',
  scenarioId: 'free_chat',
  theme: 'light'
}
