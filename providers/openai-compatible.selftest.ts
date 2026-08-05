import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createOpenAIProvider } from './openai-compatible'

let mode: 'normal' | 'done-open' | 'partial-error' | 'partial-error-no-newline' | 'error-first' = 'normal'
let openResponseClosed: (() => void) | null = null

const server = createServer(async (request, response) => {
  assert.equal(request.url, '/chat/completions')
  for await (const _chunk of request) { /* consume request body */ }
  response.writeHead(200, { 'Content-Type': 'text/event-stream' })

  if (mode === 'done-open') {
    response.once('close', () => openResponseClosed?.())
    response.write('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n')
    return
  }
  if (mode === 'normal') {
    response.end([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      '',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n'))
    return
  }
  if (mode === 'error-first') {
    response.end('data: {"error":{"message":"upstream overloaded","type":"server_error"}}\n\n')
    return
  }

  response.write('data: {"choices":[{"delta":{"content":"partial answer"}}]}\n\n')
  const errorEvent = 'data: {"error":{"message":"upstream overloaded","type":"server_error"}}'
  response.end(mode === 'partial-error' ? `${errorEvent}\n\n` : errorEvent)
})

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
try {
  const address = server.address() as AddressInfo
  const provider = createOpenAIProvider({
    apiKey: 'test-key',
    baseUrl: `http://127.0.0.1:${address.port}`,
    chatModel: 'test-chat',
    analyzeModel: 'test-analyze',
    timeoutMs: 5000,
    maxOutputTokens: 100,
  })
  const input = {
    messages: [{ role: 'user' as const, content: 'Hi' }],
    systemInstruction: 'Test',
    maxAttempts: 1,
  }

  mode = 'normal'
  const normal = await provider.chat(input)
  assert.equal(normal.content, 'Hello world')
  assert.equal(normal.isFallback, undefined)

  const responseClosed = new Promise<void>((resolve) => { openResponseClosed = resolve })
  mode = 'done-open'
  const doneOpen = await provider.chat(input)
  assert.equal(doneOpen.content, 'ok')
  await Promise.race([
    responseClosed,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('SSE reader was not canceled')), 1000)),
  ])
  openResponseClosed = null

  mode = 'partial-error'
  const failedChat = await provider.chat(input)
  assert.equal(failedChat.isFallback, true)
  assert.notEqual(failedChat.content, 'partial answer')

  mode = 'partial-error-no-newline'
  const partialStream = await provider.chatStream(input)
  const iterator = partialStream.stream[Symbol.asyncIterator]()
  assert.deepEqual(await iterator.next(), { value: { delta: 'partial answer' }, done: false })
  await assert.rejects(iterator.next(), /OpenAI stream error/)
  assert.equal(partialStream.isFallback, false)

  mode = 'error-first'
  const fallbackStream = await provider.chatStream(input)
  const chunks: string[] = []
  for await (const chunk of fallbackStream.stream) chunks.push(chunk.delta)
  assert.equal(fallbackStream.isFallback, true)
  assert.equal(chunks.length, 1)
  assert.ok(chunks[0].length > 0)

  console.log('OpenAI-compatible stream self-test OK')
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}
