import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { buildApiLimiter, configureTrustProxy } from './apiLimiter'

for (const raw of [undefined, '', ' \t ']) {
  const app = express()
  configureTrustProxy(app, raw)
  assert.equal(app.get('trust proxy'), false)
}
for (const raw of [
  'true', 'false', '1', '0', '-1', '1.5', 'loopback', 'linklocal', 'uniquelocal', 'localhost',
  '999.0.0.1', '127.1', '127.0.0.1:80', '127.0.0.1/33', '127.0.0.1/-1', '127.0.0.1/',
  '127.0.0.1/abc', '127.0.0.1/24/1', '127.0.0.1/255.255.255.0', '::1/129', '::1/-1',
  ',', '127.0.0.1,', ',127.0.0.1', '127.0.0.1, loopback',
]) {
  assert.throws(() => configureTrustProxy(express(), raw), /TRUST_PROXY|invalid range/)
}
const explicitProxies = express()
configureTrustProxy(explicitProxies, ' 192.0.2.1, 10.1.2.3/32, 2001:db8::1/128 ')
assert.deepEqual(explicitProxies.get('trust proxy'), ['192.0.2.1', '10.1.2.3/32', '2001:db8::1/128'])

async function withServer(raw: string | undefined, run: (url: string) => Promise<void>): Promise<void> {
  const app = express()
  configureTrustProxy(app, raw)
  app.post('/api/chat', buildApiLimiter(), (req, res) => res.json({ ip: req.ip }))
  const server = createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/chat`)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

async function requestIp(url: string, forwardedFor: string): Promise<{ status: number; ip?: string; error?: string }> {
  const response = await fetch(url, { method: 'POST', headers: { 'X-Forwarded-For': forwardedFor } })
  return { status: response.status, ...await response.json() }
}

await withServer(undefined, async (url) => {
  // 这里有意关闭代理信任，仅捕获并核对库对转发头的预期警告。
  const originalError = console.error
  let forwardedHeaderWarnings = 0
  console.error = (error: unknown, ...args: unknown[]) => {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR') {
      forwardedHeaderWarnings += 1
    } else {
      originalError(error, ...args)
    }
  }
  try {
    for (let index = 1; index <= 31; index += 1) {
      const result = await requestIp(url, `198.51.100.${index}`)
      assert.equal(result.status, index <= 30 ? 200 : 429, `default trust: request ${index}`)
      if (index <= 30) assert.equal(result.ip, '127.0.0.1')
      else assert.equal(result.error, 'TOO_MANY_REQUESTS')
    }
    assert.equal(forwardedHeaderWarnings, 1)
  } finally {
    console.error = originalError
  }
})

await withServer('127.0.0.1/32, ::1', async (url) => {
  for (let index = 1; index <= 31; index += 1) {
    const result = await requestIp(url, '198.51.100.1')
    assert.equal(result.status, index <= 30 ? 200 : 429, `trusted proxy: request ${index}`)
    if (index <= 30) assert.equal(result.ip, '198.51.100.1')
  }
  assert.deepEqual(await requestIp(url, '198.51.100.2'), { status: 200, ip: '198.51.100.2' })
  // 停在最近的不可信节点，不采用可伪造的最左侧地址。
  assert.deepEqual(await requestIp(url, '198.51.100.1, 203.0.113.7'), { status: 200, ip: '203.0.113.7' })
})

await withServer('192.0.2.1', async (url) => {
  for (let index = 1; index <= 31; index += 1) {
    const result = await requestIp(url, `203.0.113.${index}`)
    assert.equal(result.status, index <= 30 ? 200 : 429, `untrusted source: request ${index}`)
    if (index <= 30) assert.equal(result.ip, '127.0.0.1')
  }
})

console.log('API limiter and proxy trust self-test OK')
