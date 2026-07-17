// providers/fallback.ts
import type { AnalysisResult } from '../src/types'
import type { ProviderAnalyzeOutput } from './types'

const FALLBACKS_BY_SCENARIO: Record<string, string[]> = {
  free_chat: [
    "Tell me one small thing that happened today, and we can build a story from it. [告诉我今天发生的一件小事，我们可以从这里展开。]",
    "Let's practise a real situation. Where might you need English this week? [我们练一个真实场景吧。这周你可能会在哪里用到英语？]",
    "Choose one direction: make a plan, solve a small problem, or share an opinion. [选一个方向：制定计划、解决小问题或表达观点。]",
    "Describe a place you know well. I will help you add one clear detail at a time. [描述一个你熟悉的地方，我会帮你逐步补充细节。]",
    "Share a short story from your day. What happened first? [讲一件今天的小事吧。最先发生了什么？]",
    "What are you learning or trying to improve right now? [你最近在学什么，或者想改善什么？]",
    "Let's compare two everyday choices and explain which one works better. [我们比较两个日常选择，并说明哪个更合适。]",
    "Imagine you have a free afternoon. Make a simple plan for it. [想象你有一个空闲的下午，为它做个简单计划。]"
  ],
  ordering_coffee: [
    "Sure thing! Would you like a hot latte or an iced Americano instead? [没问题！您要热拿铁还是冰美式呢？]",
    "Got it! That will be standard size. Will there be anything else for today? [好的！帮您做标准杯。请问今天还需要别的吗？]"
  ],
  airport_checkin: [
    "Perfect. I have found your ticket. Would you prefer a window seat or an aisle seat? [好的，我已经找到您的机票了。您想要靠窗还是靠过道的座位？]",
    "Excellent. Let me print your boarding pass. Do you have any luggage to check? [太棒了。我为您打印登机牌。请问您有行李需要托运吗？]"
  ],
  asking_directions: [
    "Yes, it is very close! Just walk straight for two blocks and turn left, you will see it. [是的，非常近！直走两个街区然后左转，您就会看到了。]",
    "It is about a ten-minute walk. You can also take the subway right over there. [步行大约十分钟。您也可以在旁边坐地铁。]"
  ],
  job_interview: [
    "That is a great response. How do you handle stressful situations in a team environment? [这个回答很棒。请问在团队环境中，您是如何处理压力情况的？]",
    "Interesting background. Why do you want to join our company specifically? [有趣的背景。请问您为什么特别想要加入我们公司？]"
  ],
  hotel_reception: [
    "Welcome! Your room is ready on the fifth floor. Here is your keycard. Breakfast is served from 7 to 10 am. [欢迎！您位于五楼的房间已准备好。这是您的房卡。早餐时间是上午7点到10点。]",
    "Certainly! Your checkout is complete. We hope you had a wonderful stay with us. [好的！您的退房手续已办理完毕。希望您在我们这儿度过了美好的时光。]"
  ]
}

export function fallbackChatReply(scenarioId?: string | null, diversitySeed = 0, turn = 0): string {
  const id = scenarioId || 'free_chat'
  const list = FALLBACKS_BY_SCENARIO[id] ?? FALLBACKS_BY_SCENARIO.free_chat
  if (list.length === 0) {
    console.warn(`[fallback] no fallback entries for scenario "${id}"`)
    return ''
  }
  const idx = (Math.abs(diversitySeed) + Math.max(0, turn)) % list.length
  return list[idx]
}

export function fallbackAnalyzeResult(
  _userMessage: string,
  _assistantMessage: string | undefined,
  _level: string
): AnalysisResult {
  // Do not invent a correction, score, translation, vocabulary, or follow-up
  // suggestion when the analysis model is unavailable. A fabricated 100/100
  // is actively harmful in a learning product, so the UI presents an explicit
  // "not assessed" state for this deliberately empty payload.
  return {
    translation: '',
    grammarCorrections: [],
    assistantReplyInsight: {
      structure: '',
      grammar: '',
      whyThisReply: '',
    },
    keyWords: [],
    suggestions: [],
  }
}

export function fallbackAnalyzeOutput(
  userMessage: string,
  assistantMessage: string | undefined,
  level: string
): ProviderAnalyzeOutput {
  return {
    data: fallbackAnalyzeResult(userMessage, assistantMessage, level),
    isFallback: true
  }
}
