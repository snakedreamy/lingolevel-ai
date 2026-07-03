import rateLimit from "express-rate-limit"

export function buildApiLimiter(): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "TOO_MANY_REQUESTS", message: "请求过于频繁，请稍后再试。" },
  })
}
