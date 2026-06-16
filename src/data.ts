import { LevelConfig, Scenario } from "./types";

export const LEVELS: LevelConfig[] = [
  {
    id: "kindergarten",
    name: "幼儿园 (3-6岁)",
    englishName: "Kindergarten",
    description: "极简日常单词与互动，单句3-5个词，亲切友好、带鼓励性。",
    ageGroup: "3-6 岁儿童",
    vocabularyRange: "动物、颜色、水果、简单称呼",
    promptGuideline: "3-5 word sentences, high encouragement, basic nouns only."
  },
  {
    id: "primary_low",
    name: "小学低年级 (一至三年级)",
    englishName: "Primary School (G1-G3)",
    description: "使用简单句，介绍日常活动。词句清晰，字数少。适合刚起步的小学生。",
    ageGroup: "7-9 岁",
    vocabularyRange: "日常动作、学校物品、家庭成员",
    promptGuideline: "Simple present or past tenses, 5-8 word sentences."
  },
  {
    id: "primary_high",
    name: "小学高年级 (四至六年级)",
    englishName: "Primary School (G4-G6)",
    description: "引入简单连词（如 because, but），表达兴趣爱好与学习，开始接触复合句。",
    ageGroup: "10-12 岁",
    vocabularyRange: "周末计划、兴趣爱好、简单描述",
    promptGuideline: "Moderately simple compound clauses, 8-12 word sentences."
  },
  {
    id: "junior",
    name: "初中阶段 (中考水平)",
    englishName: "Junior High School",
    description: "涵盖中考考纲词汇。支持一般将来时、现在完成时和基础从句，讨论校园生活等。",
    ageGroup: "13-15 岁",
    vocabularyRange: "中考高频词、情绪表达、基础意见",
    promptGuideline: "Up to 1500 common words, basic adverbial and object clauses."
  },
  {
    id: "senior",
    name: "高中阶段 (高考/日常进阶)",
    englishName: "Senior High School",
    description: "高考考纲词汇（3500词）。可以使用定语从句、被动语态，畅聊多维度话题。",
    ageGroup: "16-18 岁",
    vocabularyRange: "高考考纲词、社会热点、人生规划",
    promptGuideline: "Express complex arguments, rich grammar, standard native pace."
  },
  {
    id: "college",
    name: "大学/大学英语四六级",
    englishName: "College (CET4 & CET6)",
    description: "适合四六级、考研阶段。探讨文化背景、社会心理及职业规划，地道而富有知性。",
    ageGroup: "大学生及白领",
    vocabularyRange: "四六级核心词、书面表达转换、行业讨论",
    promptGuideline: "Academic debate, intellectual expression, diverse vocabulary."
  },
  {
    id: "ielts",
    name: "雅思/托福等学术海外水平",
    englishName: "IELTS & TOEFL Prep/Academic",
    description: "高难学术及专业英语。模拟雅思口语 Part 1-3，练习高级词汇、惯用搭配和辩证思维。",
    ageGroup: "准备出国或专业用户",
    vocabularyRange: "雅思核心词、惯用语搭配、高级思辨术语",
    promptGuideline: "High-level intellectual, logical, examiner-level vocabulary and speed."
  }
];

export const SCENARIOS: Scenario[] = [
  {
    id: "free_chat",
    name: "自由聊天 (不限主题)",
    englishName: "Free Discussion",
    icon: "MessageSquare",
    description: "和 AI 进行随心所欲的自在畅聊，自由探索，打破“开不了口”的尴尬。",
    starterMessages: ["Hello! I'm your AI partner. What would you like to talk about today?", "Hi there! I am ready to carry on an interesting conversation. How has your day been?"]
  },
  {
    id: "ordering_coffee",
    name: "星巴克咖啡厅点单",
    englishName: "Ordering Coffee at Starbucks",
    icon: "Coffee",
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
    icon: "Plane",
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
    icon: "MapPin",
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
    icon: "Briefcase",
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
    icon: "Hotel",
    description: "向酒店前台核对预订信息、询问早餐时间、提供接机以及处理无线网络故障。",
    starterMessages: [
      "Welcome to the Grand Palace Hotel. How can I assist you today? Do you have a reservation?",
      "Hello! Welcome. Are you checking in today? May I please have the name under which the room was booked?"
    ]
  }
];
