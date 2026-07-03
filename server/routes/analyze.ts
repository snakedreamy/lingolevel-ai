import { Router, type Router as ExpressRouter } from "express"
import type { Provider } from "../../providers"
import { errorMessage } from "../../providers/util"
import { logRequest } from "../logger"

export function createAnalyzeRouter(args: { provider: Provider; activeProvider: string; activeAnalyzeModel: string }): ExpressRouter {
  const { provider, activeProvider, activeAnalyzeModel } = args
  const router = Router()

  router.post("/analyze", async (req, res) => {
    const start = Date.now()
    const { userMessage, assistantMessage, level } = req.body ?? {}
    if (!userMessage && !assistantMessage) {
      return res.status(400).json({ error: "userMessage or assistantMessage is required" })
    }

    try {
      const { data, isFallback } = await provider.analyzeJSON({
        userMessage: String(userMessage ?? ""),
        assistantMessage: String(assistantMessage ?? ""),
        level: String(level ?? "junior"),
      })
      logRequest({ endpoint: "analyze", provider: activeProvider, model: activeAnalyzeModel, status: 200, latencyMs: Date.now() - start, retry: 0, fallback: !!isFallback })
      res.json(data)
    } catch (error) {
      logRequest({ endpoint: "analyze", provider: activeProvider, model: activeAnalyzeModel, status: 500, latencyMs: Date.now() - start, retry: 3, fallback: true, errorMsg: errorMessage(error) })
      res.status(500).json({ error: "ANALYZE_FAILED" })
    }
  })

  return router
}
