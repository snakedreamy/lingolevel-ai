import type { LevelConfig } from "../types"

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
]
