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

export interface AnalysisResult {
  translation: string;
  grammarCorrections: GrammarCorrection[];
  keyWords: {
    word: string;
    phonetic: string;
    definition: string;
    exampleEn: string;
    exampleZh: string;
  }[];
  suggestions: string[]; // Idiomatic prompt examples user can say next
}

// ----------------------------------------------------------------------
// Browser-side, non-sensitive preferences
// ----------------------------------------------------------------------

/**
 * `ProviderId` enumerates the upstream LLM providers that the browser may
 * choose between. Keep it in sync with the server-side provider allowlist in
 * `providers/index.ts` so the UI never offers an option the backend rejects.
 */
export type ProviderId = 'openai' | 'anthropic'

/**
 * Non-sensitive user preferences that are safe to persist in `localStorage`.
 *
 * NOTE: This shape intentionally does NOT include any API key, OAuth token,
 * or other credential. Secrets are read only from server-side environment
 * variables and used by the provider layer; they must never be persisted in
 * the browser. Adding an `apiKey` field here would be a security regression.
 *
 * The defaults below are also used by the server-side `BrowserPrefs`
 * persistence tests as a stable baseline.
 */
export interface BrowserPrefs {
  /** Which upstream provider the browser sends chat/analyze calls to. */
  provider: ProviderId
  /** Model name to use for the chat / conversation turn (e.g. `gpt-4o-mini`). */
  chatModel: string
  /** Model name to use for the analysis / grammar-correction pass. */
  analyzeModel: string
  /**
   * Read-only mirror of the server-side Base URL.
   *
   * The browser does NOT edit this field — the upstream Base URL is configured
   * in the server's `.env.local` (e.g. `OPENAI_BASE_URL` /
   * `ANTHROPIC_BASE_URL`). The value is fetched from `/api/server-config` and
   * stored here only so `App.tsx` can perform a server-vs-browser mismatch
   * detection. Treating it as user-editable on the client is unsafe because
   * some third-party "transit" proxies accept any key and silently rewrite
   * responses — the only safe Base URL is the one the operator pinned at boot.
   */
  baseUrl: string
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
  provider: 'openai',
  chatModel: 'gpt-4o-mini',
  analyzeModel: 'gpt-4o-mini',
  baseUrl: '',
  level: 'junior',
  scenarioId: 'free_chat',
  theme: 'light'
}
