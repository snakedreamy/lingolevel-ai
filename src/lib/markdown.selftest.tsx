import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderMarkdown } from './markdown'

if (process.argv[2] === '--render') {
  assert.equal(renderToStaticMarkup(renderMarkdown('')), '')
  assert.match(renderToStaticMarkup(renderMarkdown('**bold**')), /<strong\b[^>]*>bold<\/strong>/)

  for (const fence of ['```', '```js', '```c++', '```c#', '```python title=x', '```typescript title="two words"']) {
    for (const closed of [true, false]) {
      for (const newline of ['\n', '\r\n']) {
        const lines = ['Before', fence, 'first <tag>', '', 'last **literal**']
        if (closed) lines.push('```', 'After')
        else lines.push('unfinished tail')
        const html = renderToStaticMarkup(renderMarkdown(lines.join(newline)))
        const label = `${fence}, closed=${closed}, newline=${JSON.stringify(newline)}`
        assert.match(html, /<p\b[^>]*>Before<\/p>/, label)
        assert.ok(html.includes(`<code>first &lt;tag&gt;\n\nlast **literal**${closed ? '' : '\nunfinished tail'}</code></pre>`), label)
        assert.equal((html.match(/<pre\b/g) ?? []).length, 1, label)
        if (closed) assert.match(html, /<p\b[^>]*>After<\/p>/, label)
      }
    }
  }
  assert.match(renderToStaticMarkup(renderMarkdown('Before\n```c++')), /<code><\/code><\/pre>$/)
} else {
  // 同步解析死循环会阻塞计时器，因此在独立 Node 进程中限制渲染时间。
  const result = spawnSync(process.execPath, [
    '--import', import.meta.resolve('tsx'), fileURLToPath(import.meta.url), '--render',
  ], { encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL' })
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr || result.stdout)
  console.log('Markdown render self-test OK (5s process timeout)')
}
