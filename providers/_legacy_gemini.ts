// providers/_legacy_gemini.ts
// DEPRECATED: kept for reference / rollback. Not selectable via PROVIDER env.
// Original implementation lives in git history before this refactor.

import { GoogleGenAI } from '@google/genai'

export function createLegacyGeminiProvider(apiKey: string, model: string) {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  })
  return {
    async chat(messages: { role: string; content: string }[], systemInstruction: string) {
      const res = await ai.models.generateContent({
        model,
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        config: { systemInstruction, temperature: 0.7 }
      })
      return res.text || 'I am listening. Go ahead!'
    }
  }
}
