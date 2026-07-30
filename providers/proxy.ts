// providers/proxy.ts
import {
  ProxyAgent,
  fetch as undiciFetch,
  type Dispatcher,
  type RequestInit as UndiciRequestInit,
} from 'undici'

/**
 * Per-provider optional HTTP(S) proxy support.
 *
 * Only affects the provider's own outbound requests; system env vars
 * (HTTP_PROXY etc.) are deliberately ignored so each API can opt in/out
 * independently. Node's built-in fetch does not honor env proxies anyway.
 */
const agents = new Map<string, Dispatcher>()

/**
 * Resolve a reusable undici dispatcher for the given proxy URL, or
 * `undefined` when no proxy is configured (falsy / empty input).
 *
 * @throws if the proxy URL is malformed — validated eagerly so a bad
 *   config surfaces at startup instead of on the first request.
 */
export function resolveProxyDispatcher(proxyUrl: string | undefined): Dispatcher | undefined {
  const url = proxyUrl?.trim()
  if (!url) return undefined
  // Throws TypeError on a malformed URL — caught by startup validation.
  new URL(url)
  let agent = agents.get(url)
  if (!agent) {
    agent = new ProxyAgent(url)
    agents.set(url, agent)
  }
  return agent
}

/**
 * Wrap a fetch call with an optional per-request proxy dispatcher.
 * When `proxyUrl` is empty this is a plain global fetch with zero overhead.
 * When a proxy is set we route through undici's own fetch: undici 8's
 * dispatcher is not wire-compatible with Node 24's built-in (vendored
 * undici 7) fetch and fails with "invalid onRequestStart method".
 * The DOM and undici RequestInit/Response types only differ structurally,
 * so the casts stay local to this wrapper.
 */
export function fetchViaProxy(
  input: string | URL,
  init: RequestInit,
  proxyUrl: string | undefined,
): Promise<Response> {
  const dispatcher = resolveProxyDispatcher(proxyUrl)
  if (!dispatcher) return fetch(input, init)
  return undiciFetch(
    input,
    { ...init, dispatcher } as unknown as UndiciRequestInit,
  ) as unknown as Promise<Response>
}
