// providers/proxy.selftest.ts
// Minimal runnable verification for per-provider proxy resolution.
// Run with: npx tsx providers/proxy.selftest.ts
import assert from 'node:assert/strict'
import { resolveProxyDispatcher } from './proxy'

// 1. Empty / missing proxy → no dispatcher (direct connection).
assert.equal(resolveProxyDispatcher(undefined), undefined)
assert.equal(resolveProxyDispatcher(''), undefined)
assert.equal(resolveProxyDispatcher('   '), undefined)

// 2. Valid proxy URL → a dispatcher, cached and reused.
const a = resolveProxyDispatcher('http://127.0.0.1:7890')
assert.ok(a, 'expected a dispatcher for a valid proxy URL')
assert.equal(resolveProxyDispatcher('http://127.0.0.1:7890'), a, 'same URL should reuse the agent')
assert.notEqual(resolveProxyDispatcher('http://127.0.0.1:7891'), a, 'different URL gets its own agent')
assert.ok(resolveProxyDispatcher('http://user:pass@127.0.0.1:7890'), 'auth in URL is accepted')
assert.ok(resolveProxyDispatcher('socks5://127.0.0.1:1080'), 'socks5 is accepted')

// 3. Malformed URL throws (surfaced as a startup config error).
assert.throws(() => resolveProxyDispatcher('not-a-url'))

console.log('proxy self-test OK')
