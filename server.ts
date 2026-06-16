// server.ts
import express from "express";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { loadProviderFromEnv, loadServerConfigFromEnv, type Provider } from "./providers";
import { errorMessage } from "./providers/util";

// dotenv reads the path array in order, with later entries overriding earlier ones.
// Putting `.env.local` last means it takes precedence over `.env`, matching the
// convention documented in README and used by providers/__manual_test.ts.
dotenv.config({ path: [".env", ".env.local"] });

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  contentSecurityPolicy: false // Vite dev injects inline scripts; CSP can be tightened for production
}));

// Rate limiting for LLM API endpoints to prevent API key exhaustion
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30,             // max 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS", message: "请求过于频繁，请稍后再试。" }
});

app.use(express.json({ limit: "1mb" }));

// Server-config echo (no Key leakage — verified by __manual_test.ts).
app.get("/api/server-config", (_req, res) => {
  try {
    res.json(loadServerConfigFromEnv());
  } catch (err) {
    res.status(500).json({ error: "SERVER_CONFIG_UNAVAILABLE", message: errorMessage(err) });
  }
});

// Load provider at boot. Failure here crashes startup with a clear log.
let provider: Provider;
try {
  provider = loadProviderFromEnv();
  console.log(`[boot] provider=${process.env.PROVIDER} ready`);
} catch (err) {
  console.error(`[boot] provider init failed: ${errorMessage(err)}`);
  process.exit(1);
}

// ----------------------------------------------------------------------
// Active provider/model snapshot — captured at boot so logRequest can read
// stable values without re-parsing env vars per request.
// `loadServerConfigFromEnv()` is reused here (it returns the same fields
// without leaking the api key).
// ----------------------------------------------------------------------
let activeProvider: string = "<unset>";
let activeChatModel: string = "<unset>";
let activeAnalyzeModel: string = "<unset>";
try {
  const cfg = loadServerConfigFromEnv();
  activeProvider = cfg.provider;
  activeChatModel = cfg.chatModel;
  activeAnalyzeModel = cfg.analyzeModel;
} catch (err) {
  // loadProviderFromEnv already succeeded above, so this should not throw.
  // If it does, we treat it as a boot bug and crash loudly.
  console.error(`[boot] active config snapshot failed: ${errorMessage(err)}`);
  process.exit(1);
}

// ----------------------------------------------------------------------
// Level system prompts (unchanged from previous version)
// ----------------------------------------------------------------------
const levelSystemPrompts: Record<string, string> = {
  kindergarten: `
    Role: You are a friendly, encouraging English speaking partner for children who are absolute beginners (Kindergarten level / 幼儿园级别).
    Rules:
    - ONLY use extremely simple English (vocabulary suitable for 3-6 years old).
    - Sentences must be very short, containing 3 to 6 words maximum.
    - Ask simple, warm, fun questions. E.g., "What is your favorite color?", "Do you like cats?"
    - Speak in a joyful, highly interactive tone. Avoid idioms, difficult phrasal verbs, or complex clauses.
    - Write only in English. Keep it brief. One or two short sentences maximum per reply.
  `,
  primary_low: `
    Role: You are an English teacher and conversational partner for Chinese primary school children in Grades 1-3 (小学低年级).
    Rules:
    - Use basic vocabulary and simple present/past tenses.
    - Use short, clear sentences of 5 to 10 words. Avoid compound sentences where possible.
    - Chat about daily activities, animals, families, food, school, and hobbies.
    - Encourage the user with praise.
    - Keep replies to 2-3 sentences. Do not overwhelm the learner. Use helpful punctuation.
  `,
  primary_high: `
    Role: You are a helpful and kind English partner for Chinese primary school children in Grades 4-6 (小学高年级).
    Rules:
    - Use clear and simple everyday English, gradually introducing common conjunctions (and, but, because).
    - Chat about family, travels, sports, music, school subjects, and plans.
    - Keep sentences clean and moderately paced (8 to 15 words per sentence).
    - Limit replies to 3-4 sentences. Ask one simple natural follow-up question.
  `,
  junior: `
    Role: You are an supportive English practice partner for Junior High School students (初中水平).
    Rules:
    - Target vocabulary typically learned in Junior High (around 1,500 common words).
    - You can use tenses like present perfect, simple future, and basic conditional "if" clauses.
    - Discuss general topics: favorite movies, books, technology, travel destinations, study tips, or sports.
    - Maintain an engaging, friendly conversation. Reply with 3-5 sentences.
  `,
  senior: `
    Role: You are an intelligent English tutor for Chinese High School students (高中水平 / Gaokao level).
    Rules:
    - Use secondary education vocabulary (around 3,500 word range) and rich sentence structures (noun clauses, attributive clauses, passive voice).
    - Chat about various lifestyle topics, dreams, societal news, science facts, culture, and life planning.
    - Speak naturally, like an average modern native English speaker. Keep your responses balanced (50-80 words).
  `,
  college: `
    Role: You are a sophisticated English convo companion for Chinese College Students (CET-4/CET-6 / 大学水平).
    Rules:
    - Speak with rich vocabulary, idiomatic expressions, and natural conversational flow.
    - Engage in deeper discussions about career plans, worldwide cultural news, academic topics, psychology, and personal values.
    - Feel free to use diverse grammatical structures. Keep the conversation rewarding, intellectual, but friendly.
  `,
  ielts: `
    Role: You are a rigorous IELTS Speaking Examiner / Professional English Coach (雅思与专业学术水平).
    Rules:
    - Speak at a high native level (Band 8+ equivalent vocabulary and phrasing).
    - Discuss IELTS Speaking Part 1, Part 2, and Part 3 structures. Introduce advanced vocabulary, professional jargon, idioms, and collocation.
    - Challenge the user with complex, abstract questions regarding environment, global economics, technology impacts, art, history, or philosophy.
  `
};

function logRequest(
  endpoint: string,
  status: number,
  latencyMs: number,
  retry: number,
  fallback: boolean,
  errorMsg?: string
) {
  const modelName = endpoint === "chat" ? activeChatModel : activeAnalyzeModel
  const base = `[${endpoint}] provider=${activeProvider} model=${modelName} status=${status} latency=${latencyMs}ms retry=${retry} fallback=${fallback}`
  console.log(errorMsg ? `${base} error=${JSON.stringify(errorMsg)}` : base)
}

// ----------------------------------------------------------------------
// /api/chat  (rate-limited)
// ----------------------------------------------------------------------
app.post("/api/chat", apiLimiter, async (req, res) => {
  const start = Date.now()
  const { messages, level, scenarioInfo } = req.body ?? {}
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" })
  }
  const levelPrompt = levelSystemPrompts[level] || levelSystemPrompts.junior
  let systemInstruction = levelPrompt
  if (scenarioInfo) {
    systemInstruction += `\nCurrently, you are roleplaying in this scenario: "${scenarioInfo.name} (${scenarioInfo.englishName})". Context: ${scenarioInfo.description}. Start or steer the conversation naturally to match this topic/scenario.`
  }
  const chatMessages: { role: "user" | "assistant"; content: string }[] = (messages as unknown[])
    .filter((m): m is { role: string; content: unknown } =>
      typeof m === "object" && m !== null && "role" in m && (m as { role: unknown }).role !== undefined
    )
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content ?? "") }))
  if (chatMessages.length === 0) {
    chatMessages.push({
      role: "user",
      content: `Say hello and welcome me to practice English. We are in the context of: ${scenarioInfo ? scenarioInfo.name : "Generative practice"}.`
    })
  }
  try {
    const result = await provider.chat({
      messages: chatMessages,
      systemInstruction,
      temperature: 0.7
    })
    logRequest("chat", 200, Date.now() - start, 0, !!result.isFallback)
    res.json({
      content: result.content,
      timestamp: Date.now(),
      isFallback: !!result.isFallback
    })
  } catch (err) {
    logRequest("chat", 500, Date.now() - start, 3, true, errorMessage(err))
    res.status(500).json({ error: "CHAT_FAILED" })
  }
})

// ----------------------------------------------------------------------
// /api/analyze  (rate-limited)
// ----------------------------------------------------------------------
app.post("/api/analyze", apiLimiter, async (req, res) => {
  const start = Date.now()
  const { userMessage, assistantMessage, level } = req.body ?? {}
  if (!userMessage && !assistantMessage) {
    return res.status(400).json({ error: "userMessage or assistantMessage is required" })
  }
  try {
    const { data, isFallback } = await provider.analyzeJSON({
      userMessage: String(userMessage ?? ""),
      assistantMessage: String(assistantMessage ?? ""),
      level: String(level ?? "junior")
    })
    logRequest("analyze", 200, Date.now() - start, 0, !!isFallback)
    res.json(data)
  } catch (err) {
    logRequest("analyze", 500, Date.now() - start, 3, true, errorMessage(err))
    res.status(500).json({ error: "ANALYZE_FAILED" })
  }
})

// ----------------------------------------------------------------------
// Vite middleware / static
// ----------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), "dist")
    app.use(express.static(distPath))
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"))
    })
  }
  const portRaw = process.env.PORT ?? '59100'
  const portNum = Number(portRaw)
  if (!Number.isFinite(portNum) || portNum <= 0) {
    console.error(`[boot] PORT must be a positive integer (got "${process.env.PORT}")`)
    process.exit(1)
  }
  console.log(`[boot] listening on port ${portNum} (from .env PORT=${process.env.PORT ?? '59100 (default)'})`)
  app.listen(portNum, "0.0.0.0", () => {
    console.log(`English Learning Chat Server running on http://localhost:${portNum}`)
  })
}

startServer().catch((err) => {
  console.error("[fatal]", errorMessage(err));
  process.exit(1);
});
