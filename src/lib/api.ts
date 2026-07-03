import type { ProviderId } from "../types"

export interface ServerConfig {
  provider: ProviderId
  chatModel: string
  analyzeModel: string
  baseUrl: string
}

export async function fetchServerConfig(): Promise<ServerConfig> {
  const response = await fetch("/api/server-config")
  if (!response.ok) {
    throw new Error("SERVER_CONFIG_UNAVAILABLE")
  }
  return (await response.json()) as ServerConfig
}
