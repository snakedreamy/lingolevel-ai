// providers/__manual_test.ts
// Run with: npx tsx providers/__manual_test.ts
// Requires a working .env.local with valid credentials.
//
// This is a MANUAL smoke test — it makes real network calls to whichever
// provider PROVIDER=... in .env.local points at. Run it after changing
// providers/index.ts, retry/fallback, or env wiring to confirm the public
// contract (no key leakage, chat returns text, analyzeJSON returns the
// expected shape) still holds end-to-end.
//
// Compatibility: this file is plain ESM TSX, run via `npx tsx`. It does
// NOT participate in the project `tsc --noEmit` build — the leading
// underscore in the filename keeps it excluded from bundler entry-point
// discovery, and the JSDoc-typed `assert` is the only TypeScript
// surface area; everything else is structural runtime checks.

import dotenv from 'dotenv'
import { loadProviderFromEnv, loadServerConfigFromEnv } from './index'
import { errorMessage } from './util'

let passed = 0
let failed = 0

function assert(label: string, cond: unknown, detail = ''): void {
  if (cond === true) {
    console.log(`  PASS  ${label}`)
    passed++
  } else {
    console.log(`  FAIL  ${label} ${detail}`)
    failed++
  }
}

async function main(): Promise<void> {
  // Match the project's local-dev convention: secrets live in .env.local
  // (gitignored). server.ts falls through to `dotenv.config()` which only
  // reads .env; this script explicitly targets .env.local so the manual
  // tester doesn't have to copy secrets into the tracked .env file.
  // `override: false` lets a real shell export win over the file (useful
  // for the "bad credentials" fallback check in step [4]).
  dotenv.config({ path: '.env.local', override: false })

  console.log('\n[1] /api/server-config must NOT contain an API key field')
  const cfg = loadServerConfigFromEnv()
  // Print keys + types only, never values — values could theoretically include
  // model/baseUrl strings that look sensitive, and the whole point of this
  // block is to prove the *field name* is absent.
  const shape = Object.fromEntries(
    Object.entries(cfg).map(([k, v]) => [k, typeof v])
  )
  console.log('     payload shape =', JSON.stringify(shape))
  for (const k of Object.keys(cfg)) {
    assert(
      `key "${k}" is not key-shaped`,
      !/key|secret|token|password/i.test(k),
      '(looks like a credential field)'
    )
  }
  assert('payload has no apiKey field', !('apiKey' in cfg))

  console.log('\n[2] provider.chat returns a non-empty string')
  const provider = loadProviderFromEnv()
  const chatOut = await provider.chat({
    messages: [{ role: 'user', content: 'Hello, can you hear me?' }],
    systemInstruction: 'You are a friendly English tutor. Reply in 1-2 short sentences.'
  })
  assert('chat content is string', typeof chatOut.content === 'string')
  assert(
    'chat content is non-empty',
    typeof chatOut.content === 'string' && chatOut.content.trim().length > 0,
    `got "${chatOut.content}"`
  )

  console.log('\n[3] provider.analyzeJSON returns a structured object')
  const analyzeOut = await provider.analyzeJSON({
    userMessage: 'I am go to school yesterday.',
    assistantMessage: 'That sounds great! What subject do you like?',
    level: 'junior'
  })
  const analysis = analyzeOut.data as Record<string, unknown>
  assert('analysis.translation is string', typeof analysis.translation === 'string')
  assert('analysis.grammarCorrections is array', Array.isArray(analysis.grammarCorrections))
  assert('analysis.keyWords is array', Array.isArray(analysis.keyWords))
  assert('analysis.suggestions is array', Array.isArray(analysis.suggestions))
  assert('analyzeOut.isFallback is boolean', typeof analyzeOut.isFallback === 'boolean')

  console.log('\n[4] fallback path triggers on bad credentials (manual swap required)')
  console.log('     skipped — verify by setting a bad key and re-running.')

  console.log(`\nSummary: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((err: unknown) => {
  // Use the shared util so we don't leak the API key via a poorly-formatted
  // error string (e.g. some SDKs embed request config in the message).
  console.error('Test runner crashed:', errorMessage(err))
  process.exit(1)
})
