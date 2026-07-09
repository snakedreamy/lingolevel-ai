export const JSON_EXTRACT_HINT = '\n\nIMPORTANT: Return ONLY a valid JSON object. No markdown code blocks, no commentary, no prefix. Just the raw JSON starting with { and ending with }.'

/**
 * Safely convert an unknown error into a human-readable string.
 * Prefers Error.message; falls back to String(err); guards against
 * pathological cases where String(err) itself throws.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as any).cause
    if (cause) {
      return `${err.message} (cause: ${errorMessage(cause)})`
    }
    return err.message
  }
  try {
    return String(err)
  } catch {
    return 'Unknown error (failed to stringify)'
  }
}

/**
 * Heuristic: does this text look like an HTML/error page or a transport-layer
 * failure payload instead of a real model response?
 */
export function looksLikeErrorContent(text: string): boolean {
  const head = text.slice(0, 256).trimStart()
  if (head.length === 0) return true

  const lower = head.toLowerCase()
  return (
    lower.startsWith('error:') ||
    lower.startsWith('error -') ||
    lower.startsWith('invalid api') ||
    lower.startsWith('authentication') ||
    lower.startsWith('unauthorized') ||
    lower.startsWith('forbidden') ||
    lower.startsWith('access denied') ||
    lower.startsWith('not found') ||
    lower.startsWith('bad request') ||
    lower.startsWith('<!doctype') ||
    lower.startsWith('<html') ||
    lower.startsWith('{"error"') ||
    lower.startsWith('{"type":"error"') ||
    lower.startsWith('an error occurred')
  )
}

/**
 * Heuristically pull a JSON object out of a (possibly noisy) model reply.
 *
 * Why this exists: many third-party "transit" relays
 * do NOT enforce `response_format: json_schema` server-side — they pass the
 * schema text to the model as a hint, and the model often wraps the JSON in
 * a ```json ... ``` fence or adds a stray leading sentence. This helper does a
 * best-effort parse so we can still extract structured data without depending
 * on protocol-enforced JSON.
 *
 * Strategy, in order:
 *   1. Find the FIRST '{' and the matching closing '}' (handles nesting).
 *   2. If that fails, look for a fenced ```json ... ``` or ``` ... ``` block.
 *   3. If neither yields valid JSON, throw — caller (callWithRetry) will
 *      retry, and on final failure the adapter returns the fallback.
 *
 * @throws Error when no candidate string parses as JSON.
 */
export function extractJsonObject(text: string): string {
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('extractJsonObject: input is empty')
  }

  // 1) Brace-balanced scan: find first '{' and its matching '}'.
  const firstBrace = text.indexOf('{')
  if (firstBrace !== -1) {
    let depth = 0
    let inString = false
    let escape = false
    for (let i = firstBrace; i < text.length; i++) {
      const ch = text[i]
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const candidate = text.slice(firstBrace, i + 1)
          // Quick sanity check: must parse. If not, fall through to fence scan.
          try {
            JSON.parse(candidate)
            return candidate
          } catch {
            break
          }
        }
      }
    }
  }

  // 2) Fenced code block: ```json ... ``` or ``` ... ```
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/i
  const fenceMatch = fenceRe.exec(text)
  if (fenceMatch && typeof fenceMatch[1] === 'string') {
    const candidate = fenceMatch[1].trim()
    try {
      JSON.parse(candidate)
      return candidate
    } catch {
      // fall through
    }
  }

  throw new Error('extractJsonObject: no parseable JSON object found in model output')
}
