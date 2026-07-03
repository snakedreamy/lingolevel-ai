import { loadProviderFromEnv, loadServerConfigFromEnv } from "../providers"
import { errorMessage } from "../providers/util"
import { createApp } from "./app"
import { loadEnv, parsePort } from "./config"

export async function startServer(): Promise<void> {
  loadEnv()

  const provider = loadProviderFromEnv()
  const cfg = loadServerConfigFromEnv()
  const app = await createApp({
    provider,
    activeProvider: cfg.provider,
    activeChatModel: cfg.chatModel,
    activeAnalyzeModel: cfg.analyzeModel,
  })
  const port = parsePort(process.env.PORT)

  console.log(`[boot] provider=${cfg.provider} ready`)
  console.log(`[boot] listening on port ${port} (from .env PORT=${process.env.PORT ?? "59100 (default)"})`)
  app.listen(port, "0.0.0.0", () => {
    console.log(`English Learning Chat Server running on http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error(`[fatal] ${errorMessage(error)}`)
  process.exit(1)
})
