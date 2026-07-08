// providers/fallback.ts
import type { AnalysisResult } from '../src/types'
import type { ProviderAnalyzeOutput } from './types'

const FALLBACKS_BY_SCENARIO: Record<string, string[]> = {
  free_chat: [
    "That's very interesting! Can you tell me more about your thoughts? [这真有趣！你能跟我聊聊你的想法吗？]",
    "I would love to learn more about you. What is your favorite hobby? [我很想进一步了解你。你最喜欢的爱好是什么？]",
    "English practice is all about persistence. How has your experience been so far? [学习英语贵在坚持。到目前为止你感觉如何？]"
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

export function fallbackChatReply(scenarioId?: string | null): string {
  const id = scenarioId || 'free_chat'
  const list = FALLBACKS_BY_SCENARIO[id] ?? FALLBACKS_BY_SCENARIO.free_chat
  if (list.length === 0) {
    console.warn(`[fallback] no fallback entries for scenario "${id}"`)
    return ''
  }
  const idx = Math.floor(Math.random() * list.length)
  return list[idx]
}

const FALLBACK_WORDS = [
  { word: 'practice',     phonetic: '/ˈpræktɪs/',     definition: 'v./n. 练习；实践', exampleEn: 'We need more practice to speak English fluently.', exampleZh: '我们需要更多练习才能流利地对话。' },
  { word: 'conversation', phonetic: '/ˌkɒnvəˈseɪʃn/', definition: 'n. 交谈，会话', exampleEn: 'I had a great conversation with my English coach.', exampleZh: '我和我的英语教练进行了一次绝佳的谈话。' },
  { word: 'expression',   phonetic: '/ɪkˈspreʃn/',     definition: 'n. 表达，词组，表情', exampleEn: 'This is a native and elegant expression.', exampleZh: '这是一个地道且优雅的表达方式。' }
]

export function fallbackAnalyzeResult(
  userMessage: string,
  assistantMessage: string | undefined,
  level: string
): AnalysisResult {
  let suggestions = [
    "Let's practice together! [让我们一起练习吧！]",
    "Sure, thank you! [好的，谢谢你！]",
    "How are you doing today? [你今天过得怎么样？]"
  ]
  if (level === 'kindergarten' || level === 'primary_low') {
    suggestions = ["Yes! [好的！]", "I like this. [我喜欢这个。]", "Look! [你看！]"]
  } else if (level === 'senior' || level === 'college' || level === 'ielts') {
    suggestions = [
      "That is a very persuasive point. [这是一个非常具有说服力的观点。]",
      "Personally, I believe consistency matters. [就我个人而言，我认为坚持不懈至关重要。]",
      "Could you elaborate more on this topic? [您能就这个话题作进一步阐述吗？]"
    ]
  }

  return {
    translation: assistantMessage
      ? `[AI智能匹配对照翻译] AI: "${assistantMessage}" -> 您的英语口语交流进行得很顺利！(系统检测到AI服务繁忙，已自动启用备用回复)`
      : `[对照翻译] -> 口语模拟器已准备就绪，练习您的第一句话吧！`,
    grammarCorrections: [
      {
        original: userMessage || 'No message',
        corrected: userMessage || 'No message',
        explanation: '您的发音以及遣词造句十分通顺健康，请大胆开口说，继续保持！',
        politeForm: userMessage || 'No message',
        score: 100
      }
    ],
    assistantReplyInsight: {
      structure: assistantMessage
        ? '它先接住当前话题，再给你一个可以继续回答的问题。'
        : '开场白先帮你开口，重点是先整句模仿再往下接。',
      grammar: '优先模仿这轮里最容易直接复用的短句或问句，不必硬找复杂语法点。',
      whyThisReply: '先回答它最后那个问题，再补一条自己的信息，通常就是最顺的接法。'
    },
    keyWords: FALLBACK_WORDS,
    suggestions
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
