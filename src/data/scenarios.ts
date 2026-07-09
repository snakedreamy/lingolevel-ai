import { Coffee, Plane, MapPin, Briefcase, Hotel, MessageSquare } from 'lucide-react'
import type { Scenario } from "../types"

export const SCENARIOS: Scenario[] = [
  {
    id: "free_chat",
    name: "自由聊天 (不限主题)",
    englishName: "Free Discussion",
    icon: MessageSquare,
    description: "和 AI 进行随心所欲的自在畅聊，自由探索，打破“开不了口”的尴尬。",
    starterMessages: ["Hello! I'm your AI partner. What would you like to talk about today?", "Hi there! I am ready to carry on an interesting conversation. How has your day been?"]
  },
  {
    id: "ordering_coffee",
    name: "星巴克咖啡厅点单",
    englishName: "Ordering Coffee at Starbucks",
    icon: Coffee,
    description: "模拟在咖啡厅里和店员确认甜度、冰量、杯型，完成一顿完美的点餐。",
    starterMessages: [
      "Hi there! Welcome to Starbucks. What can I get started for you today?",
      "Good morning! Welcome to our cafe. Would you like to try our special latte today?"
    ]
  },
  {
    id: "airport_checkin",
    name: "机场航站楼办理值机",
    englishName: "Airport Check-in & Security",
    icon: Plane,
    description: "模拟在柜台办理值机服务，选择靠窗，托运行李并核对接机口。",
    starterMessages: [
      "Good afternoon. Welcome to Star Alliance Airlines. May I have your passport and ticket, please?",
      "Hello, are you checking any bags today or just carrying on?"
    ]
  },
  {
    id: "asking_directions",
    name: "在纽约街头问路",
    englishName: "Asking for Directions in NYC",
    icon: MapPin,
    description: "模拟迷失在纽约街头，向热心的路人询问如何到达时代广场或最近的地铁站。",
    starterMessages: [
      "Excuse me! You look a bit lost. Need some help finding your way?",
      "Hi! Yes, I know this area very well. Where are you trying to go?"
    ]
  },
  {
    id: "job_interview",
    name: "知名外企英语模拟面试",
    englishName: "Global Corporation Job Interview",
    icon: Briefcase,
    description: "深度模拟投行或外企的技术与行为模式面试，回答“请自我介绍”及情景题。",
    starterMessages: [
      "Thank you for coming in today. To start off, could you please tell me a little bit about yourself and your background?",
      "Welcome to our interview process. What motivated you to apply for this specific role in our company?"
    ]
  },
  {
    id: "hotel_reception",
    name: "酒店前台入住与退房",
    englishName: "Hotel Check-in & Front Desk Help",
    icon: Hotel,
    description: "向酒店前台核对预订信息、询问早餐时间、提供接机以及处理无线网络故障。",
    starterMessages: [
      "Welcome to the Grand Palace Hotel. How can I assist you today? Do you have a reservation?",
      "Hello! Welcome. Are you checking in today? May I please have the name under which the room was booked?"
    ]
  }
]
