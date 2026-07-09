// server/index.ts — entry point + express app setup (merged from app.ts + config.ts + index.ts)
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import path from 'path'
import { createServer as createViteServer } from 'vite'
import { loadProviderFromEnv, loadServerConfigFromEnv } from '../providers'
import { errorMessage } from '../providers/util'
import { buildApiLimiter } from './middleware/apiLimiter'
import { createApiRouter } from './routes'

dotenv.config({ path: ['.env', '.env.local'] })

function parsePort(raw: string | undefined): number {
  const value = Number(raw ?? '59100')
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`PORT must be a positive integer (got "${raw}")`)
  }
  return value
}

async function createApp(): Promise<express.Express> {
  const provider = loadProviderFromEnv()
  const cfg = loadServerConfigFromEnv()

  const app = express()
  // Trust the immediate upstream reverse proxy (Nginx / Caddy / Traefik).
  // Required for express-rate-limit to read the real client IP from
  // X-Forwarded-For instead of seeing the proxy's address.
  app.set('trust proxy', 1)
  const apiLimiter = buildApiLimiter()

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' }, contentSecurityPolicy: false }))
  app.use(express.json({ limit: '1mb' }))
  app.post('/api/chat', apiLimiter)
  app.post('/api/analyze', apiLimiter)
  app.use('/api', createApiRouter({ provider, cfg }))

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' })
    app.use(vite.middlewares)
    return app
  }

  const distPath = path.join(process.cwd(), 'dist')
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'NOT_FOUND' }) })
  app.use(express.static(distPath))
  app.get(/.*/, (_req, res) => { res.sendFile(path.join(distPath, 'index.html')) })
  return app
}

createApp().then((app) => {
  const port = parsePort(process.env.PORT)
  const cfg = loadServerConfigFromEnv()
  console.log(`[boot] provider=${cfg.provider} ready`)
  console.log(`[boot] listening on port ${port}`)
  app.listen(port, '0.0.0.0', () => {
    console.log(`LingoLevel AI running on http://localhost:${port}`)
  })
}).catch((error) => {
  console.error(`[fatal] ${errorMessage(error)}`)
  process.exit(1)
})
