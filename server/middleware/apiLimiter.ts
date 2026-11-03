import { isIP } from "node:net"
import type { Express } from "express"
import rateLimit from "express-rate-limit"

export function configureTrustProxy(app: Express, raw: string | undefined): void {
  if (!raw?.trim()) {
    app.set("trust proxy", false)
    return
  }

  const proxies = raw.split(",").map((entry) => entry.trim())
  for (const entry of proxies) {
    const [ip, prefix, extra] = entry.split("/")
    if (!isIP(ip) || extra !== undefined || (prefix !== undefined && !/^\d+$/.test(prefix))) {
      throw new Error(`Invalid TRUST_PROXY entry "${entry}": use explicit proxy IP addresses or CIDRs`)
    }
  }
  // Express 编译该配置时还会校验 CIDR 前缀范围。
  app.set("trust proxy", proxies)
}

function limiter(max: number): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "TOO_MANY_REQUESTS", message: "请求过于频繁，请稍后再试。" },
  })
}

export function buildApiLimiter(): ReturnType<typeof rateLimit> {
  return limiter(30)
}

export function buildTtsLimiter(): ReturnType<typeof rateLimit> {
  return limiter(120)
}
