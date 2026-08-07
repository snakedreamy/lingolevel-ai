import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createMimoTtsProvider } from './mimo'

const wave = Buffer.alloc(46)
wave.write('RIFF', 0, 'ascii')
wave.writeUInt32LE(38, 4)
wave.write('WAVEfmt ', 8, 'ascii')
wave.writeUInt32LE(16, 16)
wave.writeUInt16LE(1, 20)
wave.writeUInt16LE(1, 22)
wave.writeUInt32LE(24_000, 24)
wave.writeUInt32LE(48_000, 28)
wave.writeUInt16LE(2, 32)
wave.writeUInt16LE(16, 34)
wave.write('data', 36, 'ascii')
wave.writeUInt32LE(2, 40)
wave.writeInt16LE(0, 44)

let receivedBody: unknown
let receivedApiKey: string | undefined
let redirectedApiKey: string | undefined
let responseMode: 'valid' | 'invalid-wave' | 'trailing-byte' | 'redirect' = 'valid'

const redirectTarget = createServer((request, response) => {
  redirectedApiKey = request.headers['api-key'] as string | undefined
  response.end()
})
await new Promise<void>((resolve) => redirectTarget.listen(0, '127.0.0.1', resolve))
const redirectAddress = redirectTarget.address() as AddressInfo

const server = createServer(async (request, response) => {
  assert.equal(request.url, '/chat/completions')
  receivedApiKey = request.headers['api-key'] as string | undefined
  let body = ''
  for await (const chunk of request) body += chunk.toString()
  receivedBody = JSON.parse(body)

  if (responseMode === 'redirect') {
    response.statusCode = 302
    response.setHeader('Location', `http://127.0.0.1:${redirectAddress.port}/capture`)
    response.end()
    return
  }

  let audio = responseMode === 'valid' ? wave : Buffer.from('RIFF....WAVE')
  if (responseMode === 'trailing-byte') {
    audio = Buffer.concat([wave, Buffer.from([0])])
    audio.writeUInt32LE(audio.length - 8, 4)
  }
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify({
    choices: [{ message: { audio: { data: audio.toString('base64') } } }],
  }))
})

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
try {
  const address = server.address() as AddressInfo
  const provider = createMimoTtsProvider({
    apiKey: 'test-key',
    baseUrl: `http://127.0.0.1:${address.port}`,
    model: 'mimo-v2.5-tts',
    voices: { 'zh-CN': '冰糖', 'en-US': 'Mia', 'en-GB': 'Mia' },
    timeoutMs: 5000,
  })
  const input = { text: 'Hello', language: 'en-US' as const, speed: 1.2 }
  const output = await provider.synthesize(input)

  assert.equal(receivedApiKey, 'test-key')
  assert.deepEqual(receivedBody, {
    model: 'mimo-v2.5-tts',
    messages: [
      { role: 'user', content: '请只朗读用户提供的文本，不添加解释、标题、提示音或额外句子。\n语言风格：自然美式英语。像英语跟读材料：发音清晰，重音和连读自然，句尾语调符合真实交流。\n速度：约为正常语速的 1.2 倍；保持可跟读，不要为了速度吞音。\n保留文本原有停顿和标点；遇到缩写、数字和专有名词时按该语言的常见读法自然处理。' },
      { role: 'assistant', content: 'Hello' },
    ],
    audio: { format: 'wav', voice: 'Mia' },
  })
  assert.equal(output.contentType, 'audio/wav')
  assert.deepEqual(output.audio, wave)

  responseMode = 'invalid-wave'
  await assert.rejects(provider.synthesize(input), /invalid WAV audio/)

  responseMode = 'trailing-byte'
  await assert.rejects(provider.synthesize(input), /invalid WAV audio/)

  responseMode = 'redirect'
  await assert.rejects(provider.synthesize(input))
  assert.equal(redirectedApiKey, undefined)

  console.log('MiMo TTS adapter self-test OK')
} finally {
  await Promise.all([
    new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
    new Promise<void>((resolve, reject) => redirectTarget.close((error) => error ? reject(error) : resolve())),
  ])
}
