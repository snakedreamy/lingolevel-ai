import rateLimit from "express-rate-limit"

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
