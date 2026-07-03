import express from "express"
import helmet from "helmet"
import path from "path"
import { createServer as createViteServer } from "vite"
import type { Provider } from "../providers"
import { buildApiLimiter } from "./middleware/apiLimiter"
import { createAnalyzeRouter } from "./routes/analyze"
import { createChatRouter } from "./routes/chat"
import { createServerConfigRouter } from "./routes/serverConfig"

export async function createApp(args: {
  provider: Provider
  activeProvider: string
  activeChatModel: string
  activeAnalyzeModel: string
}): Promise<express.Express> {
  const app = express()
  const apiLimiter = buildApiLimiter()

  app.use(helmet({
    crossOriginResourcePolicy: { policy: "same-origin" },
    contentSecurityPolicy: false,
  }))
  app.use(express.json({ limit: "1mb" }))
  app.use("/api", createServerConfigRouter())
  app.use("/api", apiLimiter, createChatRouter({ provider: args.provider, activeProvider: args.activeProvider, activeChatModel: args.activeChatModel }))
  app.use("/api", apiLimiter, createAnalyzeRouter({ provider: args.provider, activeProvider: args.activeProvider, activeAnalyzeModel: args.activeAnalyzeModel }))

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" })
    app.use(vite.middlewares)
    return app
  }

  const distPath = path.join(process.cwd(), "dist")
  app.use(express.static(distPath))
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"))
  })
  return app
}
