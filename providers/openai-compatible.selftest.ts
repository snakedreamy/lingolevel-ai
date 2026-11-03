import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { loadServerRuntimeFromEnv } from './index'
import { createOpenAIProvider } from './openai-compatible'
import { createAnthropicProvider } from './anthropic'
import type { ProviderChatStreamOutput, ProviderConfig } from './types'

const runtimeEnv = {
  PROVIDER: 'openai',
  OPENAI_API_KEY: 'test-key',
  OPENAI_BASE_URL: 'https://example.test/v1',
  OPENAI_CHAT_MODEL: 'test-chat',
  OPENAI_ANALYZE_MODEL: 'test-analyze',
  OPENAI_MODELS: 'test-extra',
  OPENAI_PROXY: '',
  REQUEST_TIMEOUT_MS: '5000',
  MAX_OUTPUT_TOKENS: '100',
  MAX_CONTEXT_MESSAGES: '12',
  FILL_BLANK_BATCH_SIZE: '10',
  FILL_BLANK_ATTEMPTS: '2',
} as const
const previousEnv = new Map(Object.keys(runtimeEnv).map((name) => [name, process.env[name]]))
try {
  Object.assign(process.env, runtimeEnv)
  const runtime = loadServerRuntimeFromEnv()
  assert.equal(runtime.config.provider, 'openai')
  assert.deepEqual(runtime.config.availableModels, ['test-chat', 'test-analyze', 'test-extra'])
  assert.equal('apiKey' in runtime.config, false)
} finally {
  for (const [name, value] of previousEnv) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
}

let mode: 'normal' | 'done-open' | 'partial-error' | 'partial-error-no-newline' | 'error-first' = 'normal'
let openResponseClosed: (() => void) | null = null
let fixture: ((request: IncomingMessage, response: ServerResponse, body: { stream?: boolean }) => void) | null = null
let requests = 0

const server = createServer(async (request, response) => {
  let body = ''
  for await (const chunk of request) body += chunk
  if (fixture) {
    requests++
    fixture(request, response, JSON.parse(body))
    return
  }
  assert.equal(request.url, '/chat/completions')
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
  const config: ProviderConfig = {
    apiKey: 'test-key',
    baseUrl: `http://127.0.0.1:${address.port}`,
    chatModel: 'test-chat',
    analyzeModel: 'test-analyze',
    timeoutMs: 5000,
    maxOutputTokens: 100,
  }
  const provider = createOpenAIProvider(config)
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

  // 缺少完成事件的 EOF 不是成功；已输出的正文也不能被回退内容替换。
  fixture = (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/event-stream' })
    response.end(openAISse('partial reply', false))
  }
  requests = 0
  assert.equal((await provider.chat(input)).isFallback, true)
  const incomplete = await provider.chatStream(input)
  const partial: string[] = []
  await assert.rejects(async () => {
    for await (const chunk of incomplete.stream) partial.push(chunk.delta)
  }, /closed before completion/)
  assert.deepEqual(partial, ['partial reply'])
  assert.equal(incomplete.isFallback, false)
  assert.equal(requests, 2)

  // 同帧的最后一段文本不可因 finish_reason 而丢失，也接受没有结尾换行。
  for (const ending of ['\n\n', '\r\n\r\n', '']) {
    fixture = (_request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/event-stream' })
      response.end(openAISse('last text').trimEnd() + ending)
    }
    assert.equal((await provider.chat(input)).content, 'last text')
    assert.equal(await collect(await provider.chatStream(input)), 'last text')
  }
  fixture = (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ choices: [{ message: { content: 'JSON reply' } }] }))
  }
  assert.equal((await provider.chat(input)).content, 'JSON reply')

  const anthropic = createAnthropicProvider(config)
  fixture = (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/event-stream' })
    const bytes = Buffer.from(anthropicSse('Hello 世界').trimEnd())
    const split = bytes.indexOf(Buffer.from('世')) + 1
    response.write(bytes.subarray(0, split))
    setImmediate(() => response.end(bytes.subarray(split)))
  }
  const standard = await anthropic.chatStream(input)
  assert.equal(await collect(standard), 'Hello 世界')
  assert.equal(standard.isFallback, false)
  fixture = (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/event-stream' })
    response.end('data: {"type":"content_block_delta",\r\ndata: "delta":{"type":"text_delta","text":"data-only"}}\r\n\r\ndata: {"type":"message_stop"}')
  }
  assert.equal(await collect(await anthropic.chatStream(input)), 'data-only')

  const creators = [['openai', createOpenAIProvider], ['anthropic', createAnthropicProvider]] as const
  for (const [name, create] of creators) {
    const current = create(config)
    const successful = name === 'openai' ? openAISse('retried') : anthropicSse('retried')
    requests = 0
    fixture = (_request, response) => {
      if (requests === 1) { response.writeHead(503); response.end(); return }
      response.writeHead(200, { 'Content-Type': 'text/event-stream' })
      response.end(successful)
    }
    const recovered = await current.chatStream({ ...input, maxAttempts: 2 })
    assert.equal(await collect(recovered), 'retried')
    assert.equal(recovered.isFallback, false)
    assert.equal(requests, 2)

    for (const maxAttempts of [1, 2]) {
      requests = 0
      fixture = (_request, response) => { response.writeHead(503); response.end() }
      const failed = await current.chatStream({ ...input, maxAttempts })
      assert.ok((await collect(failed)).length > 0)
      assert.equal(failed.isFallback, true)
      assert.equal(requests, maxAttempts)
    }

    requests = 0
    fixture = (_request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/event-stream' })
      response.end(name === 'openai'
        ? openAISse('partial', false) + 'data: {"error":{"message":"overloaded","type":"server_error"}}\n\n'
        : anthropicSse('partial', false) + 'event: error\r\ndata: {"type":"error","error":{"type":"overloaded_error","message":"overloaded"}}\r\n\r\n')
    }
    const broken = await current.chatStream({ ...input, maxAttempts: 2 })
    const emitted: string[] = []
    await assert.rejects(async () => {
      for await (const chunk of broken.stream) emitted.push(chunk.delta)
    }, /stream error/)
    assert.deepEqual(emitted, ['partial'])
    assert.equal(broken.isFallback, false)
    assert.equal(requests, 1)

    // 已收到正文后仍须保留超时；消费结束/取消时读取器应关闭。
    requests = 0
    fixture = (_request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/event-stream' })
      response.write(name === 'openai' ? openAISse('waiting', false) : anthropicSse('waiting', false))
    }
    const slow = await create({ ...config, timeoutMs: 80 }).chatStream({ ...input, maxAttempts: 2 })
    const iterator = slow.stream[Symbol.asyncIterator]()
    assert.deepEqual(await iterator.next(), { value: { delta: 'waiting' }, done: false })
    await assert.rejects(iterator.next())
    assert.equal(requests, 1)
    assert.equal(slow.isFallback, false)

    const cancellation = new AbortController()
    cancellation.abort()
    requests = 0
    await assert.rejects(collect(await current.chatStream({ ...input, signal: cancellation.signal })))
    assert.equal(requests, 0)

    for (const raw of [{}, { grammarCorrections: [{}] }]) {
      fixture = (_request, response, body) => {
        const text = JSON.stringify(raw)
        response.writeHead(200, { 'Content-Type': body.stream ? 'text/event-stream' : 'application/json' })
        response.end(body.stream ? openAISse(text) : JSON.stringify({ content: [{ type: 'text', text }] }))
      }
      const analysis = await current.analyzeJSON({ userMessage: 'I goes school.', assistantMessage: 'Hello.', level: 'primary_low' })
      assert.equal(analysis.isFallback, true)
      assert.deepEqual((analysis.data as { grammarCorrections: unknown[] }).grammarCorrections, [])
    }
    const valid = { translation: { userText: '我去学校。', aiText: '你好。' }, grammarCorrections: { score: '0', correctedVersion: 'I go to school.', explanation: '主谓一致。' } }
    fixture = (_request, response, body) => {
      const text = '```json\n' + JSON.stringify(valid) + '\n```'
      response.writeHead(200, { 'Content-Type': body.stream ? 'text/event-stream' : 'application/json' })
      response.end(body.stream ? openAISse(text) : JSON.stringify({ content: [{ type: 'text', text }] }))
    }
    const analysis = await current.analyzeJSON({ userMessage: 'I goes school.', assistantMessage: 'Hello.', level: 'primary_low' })
    assert.equal(analysis.isFallback, false)
    assert.equal((analysis.data as { grammarCorrections: Array<{ score: number }> }).grammarCorrections[0].score, 0)
  }

  let redirectedRequests = 0
  const target = createServer((_request, response) => { redirectedRequests++; response.end('{}') })
  await new Promise<void>((resolve) => target.listen(0, '127.0.0.1', resolve))
  try {
    const targetAddress = target.address() as AddressInfo
    fixture = (_request, response) => {
      response.writeHead(307, { Location: `http://127.0.0.1:${targetAddress.port}/must-not-receive-key` })
      response.end()
    }
    requests = 0
    assert.equal((await anthropic.chat(input)).isFallback, true)
    const redirectStream = await anthropic.chatStream(input)
    await collect(redirectStream)
    assert.equal(redirectStream.isFallback, true)
    assert.equal(requests, 2)
    assert.equal(redirectedRequests, 0)
  } finally {
    target.closeAllConnections()
    await new Promise<void>((resolve, reject) => target.close((error) => error ? reject(error) : resolve()))
  }
  console.log('Provider protocol, retry, analysis and redirect self-test OK')
} finally {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

async function collect(output: ProviderChatStreamOutput): Promise<string> {
  let text = ''
  for await (const chunk of output.stream) text += chunk.delta
  return text
}

function openAISse(text: string, complete = true): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: complete ? 'stop' : null }] })}\n\n`
}

function anthropicSse(text: string, complete = true): string {
  return [
    'event: message_start\r\ndata: {"type":"message_start"}\r\n\r\n',
    'event: ping\r\ndata: {"type":"ping"}\r\n\r\n',
    'event: content_block_delta\r\ndata: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"ignored"}}\r\n\r\n',
    `event: content_block_delta\r\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\r\n\r\n`,
    complete ? 'event: message_stop\r\ndata: {"type":"message_stop"}\r\n\r\n' : '',
  ].join('')
}
