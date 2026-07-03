import dotenv from "dotenv"

// dotenv reads the path array in order, with later entries overriding earlier ones.
// Putting `.env.local` last means it takes precedence over `.env`, matching the
// convention documented in README and used by providers/__manual_test.ts.
export function loadEnv(): void {
  dotenv.config({ path: [".env", ".env.local"] })
}

export function parsePort(raw: string | undefined): number {
  const value = Number(raw ?? "59100")
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`PORT must be a positive integer (got "${raw}")`)
  }
  return value
}
