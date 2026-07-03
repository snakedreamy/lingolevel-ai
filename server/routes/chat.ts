import { Router, type Router as ExpressRouter } from "express"
import type { Provider } from "../../providers"
import { errorMessage } from "../../providers/util"
import { logRequest } from "../logger"
import { composeScenarioInstruction, getLevelSystemPrompt } from "../prompts"

export function createChatRouter(args: { provider: Provider; activeProvider: string; activeChatModel: string }): ExpressRouter {
  const { provider, activeProvider, activeChatModel } = args
  const router = Router()

  router.post("/chat", async (req, res) => {
    const start = Date.now()
    const { messages, level, scenarioInfo } = req.body ?? {}
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" })
    }

    const chatMessages = (messages as unknown[])
      .filter((message): message is { role: string; content: unknown } => typeof message === "object" && message !== null && "role" in message)
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({ role: message.role as "user" | "assistant", content: String(message.content ?? "") }))

    if (chatMessages.length === 0) {
      chatMessages.push({
        role: "user",
        content: `Say hello and welcome me to practice English. We are in the context of: ${scenarioInfo ? scenarioInfo.name : "Generative practice"}.`,
      })
    }

    try {
      const result = await provider.chat({
        messages: chatMessages,
        systemInstruction: composeScenarioInstruction({
          levelPrompt: getLevelSystemPrompt(String(level ?? "junior")),
          scenarioInfo,
        }),
        temperature: 0.7,
      })

      logRequest({ endpoint: "chat", provider: activeProvider, model: activeChatModel, status: 200, latencyMs: Date.now() - start, retry: 0, fallback: !!result.isFallback })
      res.json({ content: result.content, timestamp: Date.now(), isFallback: !!result.isFallback })
    } catch (error) {
      logRequest({ endpoint: "chat", provider: activeProvider, model: activeChatModel, status: 500, latencyMs: Date.now() - start, retry: 3, fallback: true, errorMsg: errorMessage(error) })
      res.status(500).json({ error: "CHAT_FAILED" })
    }
  })

  return router
}
