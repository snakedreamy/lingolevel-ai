import { Router, type Router as ExpressRouter } from "express"
import { loadServerConfigFromEnv } from "../../providers"
import { errorMessage } from "../../providers/util"

export function createServerConfigRouter(): ExpressRouter {
  const router = Router()
  router.get("/server-config", (_req, res) => {
    try {
      res.json(loadServerConfigFromEnv())
    } catch (error) {
      res.status(500).json({ error: "SERVER_CONFIG_UNAVAILABLE", message: errorMessage(error) })
    }
  })
  return router
}
