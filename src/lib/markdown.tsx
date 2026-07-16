// src/lib/markdown.tsx
// 极简 Markdown 渲染器：只支持答疑/分析里常见的几种语法。
// 支持的语法：标题(#/##/###)、粗体(**x**)、斜体(*x*)、行内代码(`x`)、
// 引用(>)、无序列表(-/*)、有序列表(1.)、分隔线(---)、代码块(```)。
// 不引入第三方依赖；流式增量时未闭合的标记会被当作普通文本显示，下一帧自动修正。
import React from 'react'

type Block =
  | { type: 'code'; lang: string; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'quote'; content: string }
  | { type: 'hr' }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; content: string }

/** 按行切分为块级元素。 */
function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    let line = lines[i]

    // 跳过空行
    if (!line.trim()) { i++; continue }

    // 代码块 ```
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const lang = fence[1] ?? ''
      const code: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i++ }
      i++ // 跳过闭合 ```
      blocks.push({ type: 'code', lang, content: code.join('\n') })
      continue
    }

    // 分隔线 --- / *** / ___（至少 3 个）
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // 标题 # / ## / ###
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, content: heading[2].trim() })
      i++
      continue
    }

    // 引用 >（连续多行合并）
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', content: quote.join('\n') })
      continue
    }

    // 无序列表 - / *
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, '').trim())
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // 有序列表 1. 2. ...
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim())
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // 普通段落（连续非空、非特殊行合并）
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i]) &&
      !/^\s*([-*_])\1{2,}\s*$/.test(lines[i]) &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', content: para.join('\n') })
  }
  return blocks
}

/** 行内解析：粗体/斜体/行内代码/链接。返回 React 节点数组。 */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // 顺序匹配：行内代码 > 链接 > 粗体 > 斜体
  const re = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('`')) {
      nodes.push(<code key={`${keyBase}-c-${k}`} className="px-1 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700/60 font-mono text-[0.9em]">{tok.slice(1, -1)}</code>)
    } else if (tok.startsWith('[')) {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      const href = lm?.[2]?.trim()
      if (lm && href && /^(https?:\/\/|mailto:)/i.test(href)) {
        nodes.push(<a key={`${keyBase}-a-${k}`} href={href} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">{lm[1]}</a>)
      }
      else if (lm) nodes.push(lm[1])
      else nodes.push(tok)
    } else if (tok.startsWith('**')) {
      nodes.push(<strong key={`${keyBase}-b-${k}`} className="font-bold">{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith('*')) {
      nodes.push(<em key={`${keyBase}-i-${k}`} className="italic">{tok.slice(1, -1)}</em>)
    }
    last = m.index + tok.length
    k++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/**
 * 把一段 Markdown 文本渲染成 React 块级元素列表。
 * 用于聊天/答疑里展示 AI 的富文本回复。
 */
export function renderMarkdown(text: string): React.ReactNode {
  const blocks = parseBlocks(text)
  return blocks.map((b, idx) => {
    switch (b.type) {
      case 'code':
        return (
          <pre key={idx} className="my-1.5 overflow-x-auto rounded-lg bg-zinc-900 dark:bg-black/60 p-2.5 text-[11px] font-mono text-zinc-100">
            <code>{b.content}</code>
          </pre>
        )
      case 'heading': {
        const sizes = ['text-sm', 'text-[13px]', 'text-[12px]']
        return <p key={idx} className={`my-1 font-bold ${sizes[b.level - 1] ?? 'text-[12px]'}`}>{renderInline(b.content, `h${idx}`)}</p>
      }
      case 'quote':
        return <blockquote key={idx} className="my-1.5 border-l-2 border-indigo-300 dark:border-indigo-700 pl-2.5 text-zinc-600 dark:text-zinc-300">{b.content.split('\n').map((l, j) => <p key={j}>{renderInline(l, `q${idx}-${j}`)}</p>)}</blockquote>
      case 'hr':
        return <hr key={idx} className="my-2 border-zinc-200 dark:border-zinc-700" />
      case 'ul':
        return <ul key={idx} className="my-1.5 ml-4 list-disc space-y-0.5">{b.items.map((it, j) => <li key={j}>{renderInline(it, `u${idx}-${j}`)}</li>)}</ul>
      case 'ol':
        return <ol key={idx} className="my-1.5 ml-4 list-decimal space-y-0.5">{b.items.map((it, j) => <li key={j}>{renderInline(it, `o${idx}-${j}`)}</li>)}</ol>
      case 'p':
      default:
        return <p key={idx} className="my-1">{b.content.split('\n').map((l, j) => <React.Fragment key={j}>{renderInline(l, `p${idx}-${j}`)}{j < b.content.split('\n').length - 1 && <br />}</React.Fragment>)}</p>
    }
  })
}
