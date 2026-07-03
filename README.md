# lingolevel-ai

An interactive AI English coach designed for Chinese learners with adaptive difficulty levels, real-time grammar correction, translation, voice-broadcast, and interactive vocabulary notebook.

## Architecture

- **Provider abstraction layer** (`providers/`): a small typed interface (`Provider` in `providers/types.ts`) implemented by:
  - `providers/openai-compatible.ts` — any OpenAI-format chat completions endpoint (OpenAI, Groq, DeepSeek, OpenRouter, 硅基流动, self-hosted vLLM/Ollama, etc.)
  - `providers/anthropic.ts` — Anthropic Messages API
  - `providers/retry.ts` — exponential backoff wrapper for transient errors (429/5xx/timeouts)
  - `providers/fallback.ts` — canned replies returned by adapters when all retries are exhausted
  - `providers/util.ts` — shared helpers (e.g. `errorMessage`)
  - `providers/index.ts` — factory: build provider from `process.env`
- **Server** (`server.ts`): Express on the Vite dev middleware. Exposes `GET /api/server-config` (echoes active provider / model / base URL — **no API key**), `POST /api/chat`, and `POST /api/analyze`. The active provider is selected at boot from the `PROVIDER` env var.
- **Frontend** (`src/`): React + Vite SPA. **Non-sensitive user preferences** (provider URL, model names, level, scenario, theme) are persisted in `localStorage` under the key `lingolevel_prefs`. **No API keys, tokens, or secrets ever touch the browser** — the server is the only thing that talks to upstream LLMs.
- **Tooling** (`scripts/smoke.sh`, `providers/__manual_test.ts`): a curl-based smoke test and a tsx-runnable manual test, both non-zero-exit on failure.

## Run Locally

**Prerequisites:** Node.js 20+

```bash
npm install
cp .env.example .env.local
# Edit .env.local — see "Configuring your Provider" below.
npm run dev
```

By default the server runs on `http://localhost:59100`. To change the port, edit `PORT=` in `.env.local` and restart the server. Do **not** override the port via the shell — keep all config in `.env.local`.

The server prints its URL on startup (default `http://localhost:59100`).

> The server reads `.env.local` first, then `.env` as a fallback. Both are loaded by `dotenv` at boot.

## Configuring your Provider

Set `PROVIDER` to one of `openai` (any OpenAI-compatible service) or `anthropic` in `.env.local`, then fill the matching section.

> **API keys live only on the server.** They are never sent to or stored in the browser. The in-app Settings panel shows the active server-side provider/model/base URL from `/api/server-config`, but those connection values are controlled by `.env.local` and require a server restart to change. The browser only persists learning preferences such as level, scenario, and theme. `GET /api/server-config` is verified to not contain an `apiKey` field.

### A note on third-party "transit" proxies

If you point `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` at a third-party proxy or aggregator:

- **The proxy must actually speak the documented protocol.** This app talks to
  `POST /chat/completions` (OpenAI) and `POST /v1/messages` (Anthropic). A
  proxy that returns a different JSON shape, a wrapped envelope, or HTML will
  trigger our fallback path and you'll see "AI 暂不可用" instead of a real reply.
- **The proxy must validate the API key you send it.** Some proxies accept
  *any* key, substitute their own upstream key, and quietly rewrite
  responses. This app intentionally rejects responses that don't match the
  expected protocol shape, so a misbehaving proxy will surface as a fallback
  reply — not as a silently-corrupted answer.
- **Some relays advertise both protocols but only implement one.** A relay
  that says "we support OpenAI and Anthropic" may still reject every
  `POST /v1/messages` call with `unknown provider for model claude-...` if
  it only has OpenAI-format upstream models wired in. If you see that error,
  switch `PROVIDER=openai` and use the relay's OpenAI-format model name in
  `OPENAI_*_MODEL`. The Anthropic adapter in this codebase is still
  functional for direct Anthropic API access (`ANTHROPIC_BASE_URL=https://api.anthropic.com`)
  and other relays that genuinely implement the Anthropic Messages API.
- **Some relays don't enforce `response_format: json_schema` server-side.**
  They forward the schema text to the model as a hint, and the model often
  responds with a `​```json ... ​```` code block. The OpenAI-compatible
  adapter in this codebase therefore does NOT depend on
  `response_format: json_schema` — it appends a soft "return ONLY raw JSON"
  hint to the prompt and uses a brace-balanced JSON extractor (with a
  fenced-code-block fallback) to recover the structured payload. If a
  relay's model still returns prose, you'll get the canned fallback.
- **Prefer the official endpoint when possible.** OpenAI, Anthropic, Groq,
  DeepSeek, OpenRouter, and Ollama are listed below because we have
  confidence in their protocol conformance. Treat any other
  `BASE_URL` as "use at your own risk" and verify with
  `npx tsx providers/__manual_test.ts` before relying on it.

> **Note for users on third-party relay proxies**: Some relays only support OpenAI-compatible Chat Completions, even when advertising both protocols. If `PROVIDER=anthropic` returns `unknown provider for model ...` from the relay, switch `PROVIDER=openai` and use the relay's model name in `OPENAI_*_MODEL`. The Anthropic adapter in this codebase is still functional for direct Anthropic API access.

### 1) OpenAI official

```bash
PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_CHAT_MODEL="gpt-4o-mini"
OPENAI_ANALYZE_MODEL="gpt-4o-mini"
```

### 2) Groq (free tier, OpenAI-compatible)

```bash
PROVIDER="openai"
OPENAI_API_KEY="gsk_..."
OPENAI_BASE_URL="https://api.groq.com/openai/v1"
OPENAI_CHAT_MODEL="llama-3.1-8b-instant"
OPENAI_ANALYZE_MODEL="llama-3.1-8b-instant"
```

### 3) DeepSeek

```bash
PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_BASE_URL="https://api.deepseek.com/v1"
OPENAI_CHAT_MODEL="deepseek-chat"
OPENAI_ANALYZE_MODEL="deepseek-chat"
```

### 4) Self-hosted Ollama (local, no real key needed)

```bash
PROVIDER="openai"
OPENAI_API_KEY="ollama"
OPENAI_BASE_URL="http://localhost:11434/v1"
OPENAI_CHAT_MODEL="llama3.1"
OPENAI_ANALYZE_MODEL="llama3.1"
```

### 5) Anthropic Claude

```bash
PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_BASE_URL="https://api.anthropic.com"
ANTHROPIC_CHAT_MODEL="claude-3-5-sonnet-20241022"
ANTHROPIC_ANALYZE_MODEL="claude-3-5-sonnet-20241022"
```

## Project Structure

```
lingolevel-ai/
├── providers/                  # Provider abstraction layer (see Architecture)
│   ├── types.ts                # Provider interface and shared types
│   ├── schema.ts               # JSON schema for the analyze endpoint
│   ├── openai-compatible.ts    # OpenAI-format chat completions adapter
│   ├── anthropic.ts            # Anthropic Messages API adapter
│   ├── retry.ts                # exponential backoff for transient errors
│   ├── fallback.ts             # canned replies used by adapters on failure
│   ├── util.ts                 # shared helpers (errorMessage, etc.)
│   └── index.ts                # factory: build provider from process.env
├── src/                        # React + Vite frontend
│   ├── App.tsx                 # main app shell, loads/saves lingolevel_prefs
│   ├── components/             # ChatWindow, AnalysisSidebar, SettingsModal, WordBook, …
│   ├── data.ts                 # static level + scenario definitions
│   ├── types.ts                # frontend types incl. BrowserPrefs
│   ├── index.css               # global styles
│   └── main.tsx                # entry point
├── scripts/
│   └── smoke.sh                # curl-based post-startup smoke test
├── server.ts                   # Express routes, delegates to provider
├── vite.config.ts
├── index.html
├── tsconfig.json
├── package.json
└── .env.example                # template env file (copy to .env.local)
```

## Security

- **API keys are server-only.** The browser only ever talks to our own Express server; the server holds the upstream credentials and forwards requests. `BrowserPrefs` in `src/types.ts` has no `apiKey` field; `loadServerConfigFromEnv()` strips the key before responding to `GET /api/server-config`.
- **No request-body redaction is performed by `logRequest`.** The server logs only `provider`, `model`, `status`, `latency`, `retry`, `fallback`, and (on error) `errorMessage(err)` — never the request body, the `Authorization` / `x-api-key` header, or any part of the upstream response. Keep it that way when extending the logger.
- **Request bodies are capped at 1 MB** at the Express middleware level.
- **CORS is same-origin only.** The server does not enable `cors()`; it serves both the API and the SPA on the same port.
- **No secrets in the repo.** `.env.example` is a template with empty placeholders; `.env*` is git-ignored except for `.env.example`.

## Scripts

- `npm run dev` — start dev server (Vite middleware + Express)
- `npm run build` — production bundle
- `npm run start` — run the production bundle
- `npm run lint` — type-check only

## Verifying

```bash
# After npm run dev is up:
./scripts/smoke.sh 59100

# Manual provider exercise (needs valid credentials in .env.local):
npx tsx providers/__manual_test.ts
```

Both scripts exit non-zero on failure.
