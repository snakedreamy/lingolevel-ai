export function logRequest(args: {
  endpoint: "chat" | "analyze"
  provider: string
  model: string
  status: number
  latencyMs: number
  retry: number
  fallback: boolean
  errorMsg?: string
}): void {
  const { endpoint, provider, model, status, latencyMs, retry, fallback, errorMsg } = args
  const base = `[${endpoint}] provider=${provider} model=${model} status=${status} latency=${latencyMs}ms retry=${retry} fallback=${fallback}`
  console.log(errorMsg ? `${base} error=${JSON.stringify(errorMsg)}` : base)
}
