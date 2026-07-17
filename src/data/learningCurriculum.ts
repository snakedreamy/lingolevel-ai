export type LearningLevelId = 'pre_a1' | 'a1' | 'a2' | 'b1' | 'b2' | 'c1'
export type LearningDomainId = 'sentence' | 'grammar' | 'vocabulary' | 'communication' | 'pronunciation' | 'discourse'

export interface LearningLevel {
  id: LearningLevelId
  label: string
  title: string
  outcome: string
}

export interface LearningDomain {
  id: LearningDomainId
  title: string
  shortTitle: string
  purpose: string
}

export interface MasteryStandard {
  recognition: string
  understanding: string
  construction: string
  application: string
}

export interface LearningConcept {
  id: string
  level: LearningLevelId
  domain: LearningDomainId
  title: string
  summary: string
  canDo: string
  topics: string[]
  prerequisites: string[]
  mastery: MasteryStandard
  lessonId?: string
}

export interface LearningRoute {
  id: string
  title: string
  description: string
  outcome: string
  conceptIds: string[]
}

export const LEARNING_LEVELS: LearningLevel[] = [
  { id: 'pre_a1', label: 'Pre-A1', title: '起步', outcome: '识别并使用最基本的词块，表达身份、动作和即时需要。' },
  { id: 'a1', label: 'A1', title: '基础表达', outcome: '用简单句处理个人信息、日常活动和具体生活需要。' },
  { id: 'a2', label: 'A2', title: '基础扩展', outcome: '连接多个简单意思，描述过去、计划和常见生活情境。' },
  { id: 'b1', label: 'B1', title: '独立表达', outcome: '围绕熟悉或抽象话题说明经历、观点、原因和问题。' },
  { id: 'b2', label: 'B2', title: '清晰论述', outcome: '使用复杂句和连贯语篇清楚讨论广泛话题并展开论证。' },
  { id: 'c1', label: 'C1', title: '精确表达', outcome: '灵活控制结构、语域和语篇组织，准确表达细微立场。' },
]

export const LEARNING_DOMAINS: LearningDomain[] = [
  { id: 'sentence', title: '句子构建', shortTitle: '句子', purpose: '把想表达的意思组织成结构完整、顺序自然的英语句子。' },
  { id: 'grammar', title: '语法系统', shortTitle: '语法', purpose: '理解词形和结构为什么变化，并能在表达时主动控制形式。' },
  { id: 'vocabulary', title: '词汇系统', shortTitle: '词汇', purpose: '掌握核心意义、搭配、词块、词族、近义差异和语域。' },
  { id: 'communication', title: '沟通功能', shortTitle: '沟通', purpose: '系统学习如何提问、请求、解释、协商和表达立场。' },
  { id: 'pronunciation', title: '发音与听力', shortTitle: '发音', purpose: '从音素、重音和语调逐步理解并产出连续语流。' },
  { id: 'discourse', title: '语篇表达', shortTitle: '语篇', purpose: '将句子组织成连贯的对话、段落、故事、说明和论证。' },
]

function concept(args: Omit<LearningConcept, 'mastery'> & { mastery?: Partial<MasteryStandard> }): LearningConcept {
  const base = {
    recognition: `能在例句中识别“${args.title}”的形式和作用。`,
    understanding: `能用自己的话说明“${args.title}”表达什么，以及为什么这样使用。`,
    construction: `能在给定语境和词块下正确构建“${args.title}”。`,
    application: args.canDo,
  }
  return { ...args, mastery: { ...base, ...args.mastery } }
}

export const LEARNING_CONCEPTS: LearningConcept[] = [
  // Pre-A1 · 从词到可理解的最小表达
  concept({ id: 'pre-sentence-chunks', level: 'pre_a1', domain: 'sentence', title: '单词、词块与意思', summary: '先把表达看成有意义的词块，而不是孤立单词。', canDo: '能用两到四个词的固定词块表达一个完整的简单意思。', topics: ['单词与词块', '固定表达', '英语基本顺序'], prerequisites: [], lessonId: 'lesson-pre-sentence-chunks' }),
  concept({ id: 'pre-vocab-personal', level: 'pre_a1', domain: 'vocabulary', title: '个人信息核心词', summary: '建立姓名、身份、家庭和身边事物的基础词汇。', canDo: '能选择基础词汇说明自己和身边的人或物。', topics: ['姓名与身份', '家庭成员', '常见物品', '基础形容词'], prerequisites: [], lessonId: 'lesson-pre-vocab-personal' }),
  concept({ id: 'pre-pronunciation-sounds', level: 'pre_a1', domain: 'pronunciation', title: '字母、音与音节', summary: '区分字母名称、语音和单词中的音节。', canDo: '能跟读并辨认一组最常见单词的主要音和音节数。', topics: ['字母名称', '音素意识', '音节', '拼读与拼写的区别'], prerequisites: [], lessonId: 'lesson-pre-pronunciation-sounds' }),
  concept({ id: 'pre-sentence-subject', level: 'pre_a1', domain: 'sentence', title: '先说谁或什么', summary: '英语句子通常先明确谈论对象。', canDo: '能为一个简单意思选择 I、you、he、she、it、we、they 或名词作主语。', topics: ['主语概念', '人称代词', '名词作主语'], prerequisites: ['pre-sentence-chunks'], lessonId: 'lesson-pre-sentence-subject' }),
  concept({ id: 'pre-grammar-be', level: 'pre_a1', domain: 'grammar', title: 'am、is、are 基础', summary: '用 be 动词连接人物和身份、性质或位置。', canDo: '能在极简单句中选择 am、is 或 are。', topics: ['I am', '单数 is', '复数 are', 'be 的缩写'], prerequisites: ['pre-sentence-subject'], lessonId: 'lesson-pre-grammar-be' }),
  concept({ id: 'pre-communication-greeting', level: 'pre_a1', domain: 'communication', title: '问候与介绍自己', summary: '用固定表达开启交流并给出最基本的个人信息。', canDo: '能完成问候、说出姓名并回应对方。', topics: ['hello/hi', 'My name is', 'I am', 'Nice to meet you'], prerequisites: ['pre-vocab-personal', 'pre-grammar-be'], lessonId: 'lesson-pre-communication-greeting' }),
  concept({ id: 'pre-sentence-action', level: 'pre_a1', domain: 'sentence', title: '再说做什么', summary: '用动作词说明主语正在做什么。', canDo: '能构建“谁 + 动作”的最小句子。', topics: ['动作动词', '主语 + 动词', '英语动作顺序'], prerequisites: ['pre-sentence-subject'], lessonId: 'lesson-pre-sentence-action' }),
  concept({ id: 'pre-grammar-nouns', level: 'pre_a1', domain: 'grammar', title: '一个与多个', summary: '理解单数、复数以及 a/an 的最基本关系。', canDo: '能区分一个和多个常见事物，并使用基础复数形式。', topics: ['a/an', '规则复数 -s', 'this/these', '数字 + 名词'], prerequisites: ['pre-vocab-personal'], lessonId: 'lesson-pre-grammar-nouns' }),
  concept({ id: 'pre-vocab-actions', level: 'pre_a1', domain: 'vocabulary', title: '高频动作与需要', summary: '掌握吃、喝、去、来、看、想要等高频动作词块。', canDo: '能用高频动词表达即时动作、选择和需要。', topics: ['go/come', 'eat/drink', 'see/look', 'want/need', '动词词块'], prerequisites: ['pre-sentence-chunks'], lessonId: 'lesson-pre-vocab-actions' }),
  concept({ id: 'pre-communication-needs', level: 'pre_a1', domain: 'communication', title: '表达需要与选择', summary: '用最短表达说出想要什么、需要什么和选择哪一个。', canDo: '能表达一个具体需要并在两个选项中作答。', topics: ['I want', 'I need', 'this one', 'yes/no'], prerequisites: ['pre-vocab-actions', 'pre-sentence-action'], lessonId: 'lesson-pre-communication-needs' }),
  concept({ id: 'pre-pronunciation-stress', level: 'pre_a1', domain: 'pronunciation', title: '熟悉词的重音', summary: '在熟悉单词和短词块中听出并模仿突出的音节。', canDo: '能清楚跟读常见词和短语的基本重音。', topics: ['强弱音节', '词重音', '短语跟读'], prerequisites: ['pre-pronunciation-sounds'], lessonId: 'lesson-pre-pronunciation-stress' }),
  concept({ id: 'pre-discourse-exchange', level: 'pre_a1', domain: 'discourse', title: '一问一答的最小交流', summary: '理解简单交流由相关的提问和回应组成。', canDo: '能用固定词块完成两到三轮相关交流。', topics: ['提问—回应', '相关回答', 'and/then 初步'], prerequisites: ['pre-communication-greeting', 'pre-communication-needs'], lessonId: 'lesson-pre-discourse-exchange' }),

  // A1 · 简单句与日常生活
  concept({ id: 'a1-sentence-svo', level: 'a1', domain: 'sentence', title: '主语、动作与宾语', summary: '把“谁做什么、影响什么”组织成主谓宾句。', canDo: '能根据自己的生活独立写出三个自然的主谓宾句。', topics: ['主语', '谓语动词', '宾语', 'SVO 顺序'], prerequisites: ['pre-sentence-action', 'pre-vocab-actions'], lessonId: 'lesson-a1-sentence-svo' }),
  concept({ id: 'a1-grammar-present', level: 'a1', domain: 'grammar', title: '一般现在时与主谓一致', summary: '表达习惯和事实，并处理第三人称单数。', canDo: '能用一般现在时描述自己和他人的日常活动。', topics: ['动词原形', '第三人称 -s', '频率表达', '习惯与事实'], prerequisites: ['a1-sentence-svo', 'pre-grammar-nouns'], lessonId: 'lesson-a1-grammar-present' }),
  concept({ id: 'a1-vocab-routines', level: 'a1', domain: 'vocabulary', title: '日常活动与时间词块', summary: '用高频搭配描述起居、学习、工作和休闲。', canDo: '能组合常用动作搭配和时间表达描述一天。', topics: ['get up/go to bed', 'have breakfast', 'go to school/work', 'every/at/on'], prerequisites: ['pre-vocab-actions'], lessonId: 'lesson-a1-vocab-routines' }),
  concept({ id: 'a1-pronunciation-vowels', level: 'a1', domain: 'pronunciation', title: '核心元音与辅音对比', summary: '辨认容易混淆且会影响理解的英语音。', canDo: '能在熟悉词中辨认并清楚发出主要元音和辅音对比。', topics: ['长短元音', '清浊辅音', '最小对立词', '口型与发音位置'], prerequisites: ['pre-pronunciation-sounds'], lessonId: 'lesson-a1-pronunciation-vowels' }),
  concept({ id: 'a1-sentence-be', level: 'a1', domain: 'sentence', title: '身份、状态与位置句', summary: '区分动作句和 be 动词句。', canDo: '能用 be 动词描述人物身份、状态和所在位置。', topics: ['主语 + be + 名词', '主语 + be + 形容词', '主语 + be + 地点'], prerequisites: ['pre-grammar-be', 'a1-sentence-svo'], lessonId: 'lesson-a1-sentence-be' }),
  concept({ id: 'a1-grammar-continuous', level: 'a1', domain: 'grammar', title: '现在进行时', summary: '使用 be + 动词-ing 表达此刻或当前阶段正在发生的动作。', canDo: '能区分日常习惯和此刻正在发生的动作。', topics: ['be + -ing', '拼写变化', 'now/at the moment', '现在时对比'], prerequisites: ['a1-sentence-be', 'a1-grammar-present'], lessonId: 'lesson-a1-grammar-continuous' }),
  concept({ id: 'a1-sentence-negative-question', level: 'a1', domain: 'sentence', title: '简单否定与疑问', summary: '根据句子谓语选择 be 或 do 来否定和提问。', canDo: '能把熟悉的肯定句改成否定句和一般疑问句。', topics: ['be not', 'do/does not', 'be 提前', 'do/does 提问'], prerequisites: ['a1-sentence-be', 'a1-grammar-present'], lessonId: 'lesson-a1-negative-question' }),
  concept({ id: 'a1-grammar-determiners', level: 'a1', domain: 'grammar', title: '冠词、指示与所有关系', summary: '说明一个事物是泛指、特指、近处、远处或属于谁。', canDo: '能在基础名词短语中选择 a/an、the、this/that 和所有格。', topics: ['a/an/the', 'this/that/these/those', 'my/your/his/her', "'s 所有格"], prerequisites: ['pre-grammar-nouns'], lessonId: 'lesson-a1-grammar-determiners' }),
  concept({ id: 'a1-vocab-chunks', level: 'a1', domain: 'vocabulary', title: '高频搭配与固定词块', summary: '不只记单词，还要记它通常和什么词一起出现。', canDo: '能在日常表达中使用常见动词—名词和形容词—介词搭配。', topics: ['动词 + 名词', '形容词 + 介词', '固定问句', '情境词块'], prerequisites: ['a1-vocab-routines'], lessonId: 'lesson-a1-vocab-chunks' }),
  concept({ id: 'a1-communication-basic', level: 'a1', domain: 'communication', title: '介绍、描述与喜好', summary: '完成自我介绍，描述熟悉的人物事物并说明简单喜好。', canDo: '能围绕自己、家庭和日常生活连续表达数句。', topics: ['介绍自己', '描述人物和物品', '喜欢与不喜欢', '简单原因'], prerequisites: ['a1-sentence-svo', 'a1-sentence-be', 'a1-vocab-routines'], lessonId: 'lesson-a1-communication-basic' }),
  concept({ id: 'a1-communication-transactions', level: 'a1', domain: 'communication', title: '基础请求与生活事务', summary: '在商店、餐馆、交通等可预测场景中完成简单任务。', canDo: '能提出一个简单请求、询问价格或地点并理解直接回应。', topics: ['Can I...?', 'I would like...', 'How much...?', 'Where is...?'], prerequisites: ['a1-sentence-negative-question', 'a1-vocab-chunks'], lessonId: 'lesson-a1-communication-transactions' }),
  concept({ id: 'a1-pronunciation-flow', level: 'a1', domain: 'pronunciation', title: '词尾、句子重音与基础语调', summary: '让熟悉短句的词尾和重音足够清楚。', canDo: '能清楚读出复数、第三人称词尾，并用语调区分陈述和提问。', topics: ['-s/-es 词尾', '-ing 词尾', '内容词重读', '陈述与疑问语调'], prerequisites: ['pre-pronunciation-stress', 'a1-grammar-present'], lessonId: 'lesson-a1-pronunciation-flow' }),
  concept({ id: 'a1-discourse-linking', level: 'a1', domain: 'discourse', title: '用 and、but、because、then 连接', summary: '把孤立句子连接成有顺序、有关系的短表达。', canDo: '能用基础连接词组织四到五个相关句子。', topics: ['and 添加', 'but 转折', 'because 原因', 'then 顺序'], prerequisites: ['a1-sentence-svo', 'pre-discourse-exchange'], lessonId: 'lesson-a1-discourse-linking' }),
  concept({ id: 'a1-discourse-messages', level: 'a1', domain: 'discourse', title: '短消息与简单段落', summary: '围绕一个中心写便条、消息或短段落。', canDo: '能写一段包含开头、相关信息和结尾的简短文本。', topics: ['主题句初步', '短消息格式', '基本标点', '信息顺序'], prerequisites: ['a1-discourse-linking', 'a1-communication-basic'], lessonId: 'lesson-a1-discourse-messages' }),

  // A2 · 时间、连接与常见任务
  concept({ id: 'a2-sentence-past', level: 'a2', domain: 'sentence', title: '讲述过去事件', summary: '用过去时间、过去式和事件顺序还原已经发生的事情。', canDo: '能用若干句讲述一次简单的过去经历。', topics: ['过去时间', '规则与不规则过去式', 'was/were', '事件顺序'], prerequisites: ['a1-grammar-present', 'a1-discourse-linking'], lessonId: 'lesson-a2-sentence-past' }),
  concept({ id: 'a2-grammar-past', level: 'a2', domain: 'grammar', title: '一般过去时与过去进行时', summary: '区分完成的过去事件和当时正在进行的背景动作。', canDo: '能用两种过去时说明背景、主要事件和打断关系。', topics: ['did', '过去式', 'was/were + -ing', 'when/while'], prerequisites: ['a2-sentence-past', 'a1-grammar-continuous'], lessonId: 'lesson-a2-grammar-past' }),
  concept({ id: 'a2-vocab-life', level: 'a2', domain: 'vocabulary', title: '生活事务主题词汇', summary: '扩展购物、出行、健康、工作、学习和服务场景的词块。', canDo: '能在常见生活事务中选用准确的高频词和搭配。', topics: ['购物与服务', '旅行与交通', '健康与身体', '工作与学习'], prerequisites: ['a1-vocab-chunks'], lessonId: 'lesson-a2-vocab-life' }),
  concept({ id: 'a2-pronunciation-endings', level: 'a2', domain: 'pronunciation', title: '语法词尾与弱读', summary: '听辨并产出过去式、复数等词尾，同时识别功能词弱读。', canDo: '能在短句中清楚表达关键词尾，并听出常见弱读词。', topics: ['-ed 三种读音', '-s 三种读音', 'a/the/to/of 弱读', '句子节奏'], prerequisites: ['a1-pronunciation-flow', 'a2-grammar-past'], lessonId: 'lesson-a2-pronunciation-endings' }),
  concept({ id: 'a2-sentence-future', level: 'a2', domain: 'sentence', title: '表达计划、安排与预测', summary: '根据意图选择 be going to、现在进行时或 will。', canDo: '能说明个人计划、已安排事项和简单预测。', topics: ['be going to', '现在进行时表安排', 'will 预测/即时决定'], prerequisites: ['a1-grammar-continuous', 'a2-sentence-past'], lessonId: 'lesson-a2-sentence-future' }),
  concept({ id: 'a2-grammar-comparison', level: 'a2', domain: 'grammar', title: '比较、数量与程度', summary: '比较人和事物，并表达多少、足够和过度。', canDo: '能比较两个或多个选项并说明差异。', topics: ['比较级/最高级', 'as...as', 'much/many/few/little', 'too/enough'], prerequisites: ['a1-grammar-determiners'], lessonId: 'lesson-a2-grammar-comparison' }),
  concept({ id: 'a2-sentence-clauses', level: 'a2', domain: 'sentence', title: '原因、时间、条件与结果', summary: '用基本从属连接词表达两个意思之间的逻辑。', canDo: '能使用 because、when、if、so 连接相关分句。', topics: ['原因', '时间', '真实条件', '结果'], prerequisites: ['a1-discourse-linking', 'a2-sentence-future'], lessonId: 'lesson-a2-sentence-clauses' }),
  concept({ id: 'a2-grammar-perfect', level: 'a2', domain: 'grammar', title: '现在完成时入门', summary: '把过去发生的事情与现在的经历或结果联系起来。', canDo: '能用 have/has + 过去分词谈论经历和刚完成的事情。', topics: ['ever/never', 'just/already/yet', '过去分词', '与一般过去时初步对比'], prerequisites: ['a2-grammar-past'], lessonId: 'lesson-a2-grammar-perfect' }),
  concept({ id: 'a2-vocab-development', level: 'a2', domain: 'vocabulary', title: '词族、多义与常用短语动词', summary: '从一个词扩展相关词形、常见义项和短语动词。', canDo: '能借助词族和上下文理解并使用常见多义词。', topics: ['名词/动词/形容词词族', '一词多义', '基础短语动词', '语境猜义'], prerequisites: ['a2-vocab-life'], lessonId: 'lesson-a2-vocab-development' }),
  concept({ id: 'a2-communication-social', level: 'a2', domain: 'communication', title: '邀请、建议、道歉与回应', summary: '处理常见社交任务并选择得体的固定表达。', canDo: '能发出邀请或建议，接受、拒绝并给出简单理由。', topics: ['Would you like...?', 'Why don’t we...?', '接受与拒绝', '道歉与解释'], prerequisites: ['a1-communication-transactions', 'a2-sentence-clauses'], lessonId: 'lesson-a2-communication-social' }),
  concept({ id: 'a2-communication-information', level: 'a2', domain: 'communication', title: '交换信息与解决常见问题', summary: '询问细节、确认理解并说明一个日常问题。', canDo: '能在服务或旅行场景中确认信息并处理可预测问题。', topics: ['澄清与确认', '询问步骤', '描述故障', '提出简单解决办法'], prerequisites: ['a2-vocab-life', 'a2-communication-social'], lessonId: 'lesson-a2-communication-information' }),
  concept({ id: 'a2-pronunciation-connected', level: 'a2', domain: 'pronunciation', title: '基础连读与意群', summary: '按照意义把短句分成意群，并识别常见辅音—元音连读。', canDo: '能用清楚的意群和基础连读朗读日常短句。', topics: ['辅音—元音连读', '意群停顿', '节奏', '关键词重读'], prerequisites: ['a2-pronunciation-endings'], lessonId: 'lesson-a2-pronunciation-connected' }),
  concept({ id: 'a2-discourse-narrative', level: 'a2', domain: 'discourse', title: '短故事与过程说明', summary: '按时间顺序组织事件或操作步骤。', canDo: '能写或讲一个有开端、经过和结果的简短故事或过程。', topics: ['first/next/finally', '背景—事件—结果', '步骤说明', '指代一致'], prerequisites: ['a2-sentence-past', 'a1-discourse-messages'], lessonId: 'lesson-a2-discourse-narrative' }),
  concept({ id: 'a2-discourse-functional', level: 'a2', domain: 'discourse', title: '邮件、说明与简单比较段落', summary: '根据目的组织常见实用文本。', canDo: '能写简短邮件、说明或比较段落，并保持信息完整。', topics: ['邮件开头结尾', '请求与回复', '比较结构', '段落中心'], prerequisites: ['a2-grammar-comparison', 'a2-discourse-narrative'], lessonId: 'lesson-a2-discourse-functional' }),

  // B1 · 独立说明经历、观点与问题
  concept({ id: 'b1-sentence-aspect', level: 'b1', domain: 'sentence', title: '时间与完成关系', summary: '用时态和体说明事件何时发生、是否持续及与现在的关系。', canDo: '能在叙述中合理切换一般过去、现在完成和过去进行时。', topics: ['时态选择', '完成与持续', '时间线', 'for/since'], prerequisites: ['a2-grammar-perfect', 'a2-grammar-past'], lessonId: 'lesson-b1-sentence-aspect' }),
  concept({ id: 'b1-grammar-perfect', level: 'b1', domain: 'grammar', title: '完成时与完成进行时', summary: '区分结果、经历、持续时间和反复活动。', canDo: '能使用现在完成及其进行形式说明结果和持续过程。', topics: ['have done', 'have been doing', 'for/since', '完成时与过去时'], prerequisites: ['b1-sentence-aspect'], lessonId: 'lesson-b1-grammar-perfect' }),
  concept({ id: 'b1-vocab-collocation', level: 'b1', domain: 'vocabulary', title: '搭配、短语动词与词义选择', summary: '以搭配和语境为单位扩展熟悉话题词汇。', canDo: '能在常见话题中选择自然搭配，并用释义绕开词汇缺口。', topics: ['常用搭配', '短语动词', '近义词初步', '释义表达'], prerequisites: ['a2-vocab-development'], lessonId: 'lesson-b1-vocab-collocation' }),
  concept({ id: 'b1-pronunciation-fluency', level: 'b1', domain: 'pronunciation', title: '弱读、连读与可理解流利度', summary: '把功能词弱读、连读和意群结合进较长表达。', canDo: '能以基本稳定的节奏说出一段可理解的连续表达。', topics: ['弱读', '连读', '失去爆破初步', '意群与停顿'], prerequisites: ['a2-pronunciation-connected'], lessonId: 'lesson-b1-pronunciation-fluency' }),
  concept({ id: 'b1-sentence-relative', level: 'b1', domain: 'sentence', title: '用从句补充人物和事物', summary: '使用关系从句把说明信息嵌入名词之后。', canDo: '能用 who、which、that、where 补充必要信息。', topics: ['定语从句', '关系代词', '关系副词', '限定信息'], prerequisites: ['a2-sentence-clauses'], lessonId: 'lesson-b1-sentence-relative' }),
  concept({ id: 'b1-grammar-passive', level: 'b1', domain: 'grammar', title: '被动语态', summary: '当动作承受者或结果更重要时改变句子焦点。', canDo: '能在常见时态中构建被动句并说明为何使用被动。', topics: ['be + 过去分词', '时态与被动', 'by 短语', '主动/被动选择'], prerequisites: ['b1-sentence-aspect', 'a2-grammar-perfect'], lessonId: 'lesson-b1-grammar-passive' }),
  concept({ id: 'b1-sentence-reporting', level: 'b1', domain: 'sentence', title: '转述信息与观点', summary: '把他人的原话转换为转述内容。', canDo: '能转述常见陈述、问题和请求，并保持核心意思。', topics: ['reported statements', '间接问句', '时态回移', 'say/tell/ask'], prerequisites: ['b1-sentence-relative', 'b1-sentence-aspect'], lessonId: 'lesson-b1-sentence-reporting' }),
  concept({ id: 'b1-grammar-conditionals', level: 'b1', domain: 'grammar', title: '真实与假设条件', summary: '区分可能发生的条件和与现实有距离的假设。', canDo: '能使用第一和第二条件句讨论结果、建议和假设。', topics: ['first conditional', 'second conditional', 'unless', '条件与结果'], prerequisites: ['a2-sentence-clauses', 'a2-sentence-future'], lessonId: 'lesson-b1-grammar-conditionals' }),
  concept({ id: 'b1-vocab-register', level: 'b1', domain: 'vocabulary', title: '词族、近义差异与语体', summary: '根据上下文和正式程度选择更准确的词。', canDo: '能在日常和较正式表达之间选择合适词汇。', topics: ['派生词', '近义词差异', '正式/非正式', '常见抽象名词'], prerequisites: ['b1-vocab-collocation'], lessonId: 'lesson-b1-vocab-register' }),
  concept({ id: 'b1-communication-opinions', level: 'b1', domain: 'communication', title: '表达观点、理由与不确定性', summary: '清楚提出观点，并用理由、例子和保留态度支持它。', canDo: '能围绕熟悉议题表达观点并回应不同意见。', topics: ['In my view', '理由与例子', '同意/不同意', '可能性和保留'], prerequisites: ['a2-communication-information', 'b1-vocab-register'], lessonId: 'lesson-b1-communication-opinions' }),
  concept({ id: 'b1-communication-problems', level: 'b1', domain: 'communication', title: '解释问题、投诉与协商', summary: '描述不顺利的情况，说明影响并讨论解决方案。', canDo: '能处理不太常规的生活问题并协商可行办法。', topics: ['说明问题', '礼貌投诉', '提出方案', '确认结果'], prerequisites: ['b1-communication-opinions', 'b1-grammar-conditionals'], lessonId: 'lesson-b1-communication-problems' }),
  concept({ id: 'b1-pronunciation-stance', level: 'b1', domain: 'pronunciation', title: '句子重音与态度语调', summary: '通过重音和基本语调表达重点、确定和疑问。', canDo: '能改变句子重音突出关键信息，并使用可理解的态度语调。', topics: ['核心重音', '对比重音', '升降调', '态度与语调'], prerequisites: ['b1-pronunciation-fluency'], lessonId: 'lesson-b1-pronunciation-stance' }),
  concept({ id: 'b1-discourse-paragraphs', level: 'b1', domain: 'discourse', title: '段落中心与信息展开', summary: '让每个段落围绕一个中心，并用细节支持。', canDo: '能写出有主题句、支持信息和收束句的连贯段落。', topics: ['主题句', '支持细节', '例子', '指代与重复'], prerequisites: ['a2-discourse-functional', 'b1-communication-opinions'], lessonId: 'lesson-b1-discourse-paragraphs' }),
  concept({ id: 'b1-discourse-genres', level: 'b1', domain: 'discourse', title: '叙事、说明与基础论证', summary: '根据表达目的选择不同的组织方式。', canDo: '能完成结构清楚的故事、说明文或基础观点文本。', topics: ['叙事弧线', '问题—解决', '因果说明', '观点—理由—例子'], prerequisites: ['b1-discourse-paragraphs', 'b1-sentence-reporting'], lessonId: 'lesson-b1-discourse-genres' }),

  // B2 · 复杂句、论证与语域控制
  concept({ id: 'b2-sentence-packaging', level: 'b2', domain: 'sentence', title: '复杂名词短语与信息压缩', summary: '用修饰语、介词短语和从句把相关信息组织进名词短语。', canDo: '能构建清楚但不过度堆叠的复杂名词短语。', topics: ['前置修饰', '后置修饰', '介词短语', '同位语'], prerequisites: ['b1-sentence-relative', 'b1-discourse-paragraphs'], lessonId: 'lesson-b2-sentence-packaging' }),
  concept({ id: 'b2-grammar-advanced-aspect', level: 'b2', domain: 'grammar', title: '复杂时态、体与叙事视角', summary: '根据叙事焦点灵活组合完成、进行和被动形式。', canDo: '能在较长叙述中稳定控制时间关系和叙事视角。', topics: ['过去完成', '完成进行', '被动时态', '叙事时态切换'], prerequisites: ['b1-grammar-perfect', 'b1-grammar-passive'], lessonId: 'lesson-b2-grammar-advanced-aspect' }),
  concept({ id: 'b2-vocab-precision', level: 'b2', domain: 'vocabulary', title: '精确搭配、语义色彩与避免重复', summary: '用更准确的搭配、近义词和改述表达细微差异。', canDo: '能在广泛话题中减少重复并选择较准确自然的词。', topics: ['高频学术搭配', '语义色彩', '同义改述', '词汇控制'], prerequisites: ['b1-vocab-register'], lessonId: 'lesson-b2-vocab-precision' }),
  concept({ id: 'b2-pronunciation-rhythm', level: 'b2', domain: 'pronunciation', title: '连续语流中的节奏与音变', summary: '理解弱化、同化、省音等现象如何改变句中声音。', canDo: '能听辨常见连续语流音变，并保持较自然清楚的节奏。', topics: ['同化', '省音', '弱化', '重音计时节奏'], prerequisites: ['b1-pronunciation-fluency'], lessonId: 'lesson-b2-pronunciation-rhythm' }),
  concept({ id: 'b2-sentence-stance', level: 'b2', domain: 'sentence', title: '立场、强调与限制', summary: '用情态、评注和限制结构控制观点强度。', canDo: '能清楚区分事实、推断、可能性和个人判断。', topics: ['情态与推断', 'hedging', '强调句', '限制条件'], prerequisites: ['b1-communication-opinions', 'b2-sentence-packaging'], lessonId: 'lesson-b2-sentence-stance' }),
  concept({ id: 'b2-grammar-conditionals', level: 'b2', domain: 'grammar', title: '混合条件与过去假设', summary: '讨论未发生的过去、其结果以及跨时间条件关系。', canDo: '能使用第三和混合条件句表达遗憾、推测和结果。', topics: ['third conditional', 'mixed conditionals', 'wish/if only', '条件倒装初步'], prerequisites: ['b1-grammar-conditionals', 'b2-grammar-advanced-aspect'], lessonId: 'lesson-b2-grammar-conditionals' }),
  concept({ id: 'b2-sentence-reduction', level: 'b2', domain: 'sentence', title: '非谓语与从句简化', summary: '使用不定式、动名词和分词结构压缩重复信息。', canDo: '能在主语关系清楚时用非谓语结构简洁表达。', topics: ['to-infinitive', 'gerund', 'participle clauses', 'reduced relatives'], prerequisites: ['b2-sentence-packaging', 'b1-grammar-passive'], lessonId: 'lesson-b2-sentence-reduction' }),
  concept({ id: 'b2-grammar-reporting', level: 'b2', domain: 'grammar', title: '高级转述、被动与报道结构', summary: '通过报道动词和非人称结构客观组织来源信息。', canDo: '能准确转述不同立场并使用常见报道被动结构。', topics: ['reporting verbs', 'It is said that', 'is believed to', '转述立场'], prerequisites: ['b1-sentence-reporting', 'b2-sentence-reduction'], lessonId: 'lesson-b2-grammar-reporting' }),
  concept({ id: 'b2-vocab-idiomatic', level: 'b2', domain: 'vocabulary', title: '习语、专业词与语域适配', summary: '理解常见习语并掌握自己领域的核心专业表达。', canDo: '能在合适场合使用常见习语和本领域专业词汇。', topics: ['常见习语', '搭配限制', '专业术语', '语域适配'], prerequisites: ['b2-vocab-precision'], lessonId: 'lesson-b2-vocab-idiomatic' }),
  concept({ id: 'b2-communication-argument', level: 'b2', domain: 'communication', title: '展开论证与回应反方', summary: '提出主张、组织依据、承认限制并回应异议。', canDo: '能围绕一般或专业话题展开有层次的讨论。', topics: ['主张与证据', '让步', '反驳', '总结立场'], prerequisites: ['b1-communication-opinions', 'b2-sentence-stance'], lessonId: 'lesson-b2-communication-argument' }),
  concept({ id: 'b2-communication-mediate', level: 'b2', domain: 'communication', title: '概括、转述与促进讨论', summary: '提取重点、换一种说法并帮助多人建立共同理解。', canDo: '能概括较长信息、解释关键概念并推动讨论继续。', topics: ['摘要', '改述', '澄清概念', '邀请参与'], prerequisites: ['b2-grammar-reporting', 'b2-communication-argument'], lessonId: 'lesson-b2-communication-mediate' }),
  concept({ id: 'b2-pronunciation-focus', level: 'b2', domain: 'pronunciation', title: '信息焦点与语调段落', summary: '用重音位置、语调和停顿组织较长信息。', canDo: '能通过语音手段清楚标示新信息、对比和篇章边界。', topics: ['核重音', '语调段', '对比焦点', '篇章停顿'], prerequisites: ['b1-pronunciation-stance', 'b2-pronunciation-rhythm'], lessonId: 'lesson-b2-pronunciation-focus' }),
  concept({ id: 'b2-discourse-cohesion', level: 'b2', domain: 'discourse', title: '衔接、指代与信息流', summary: '综合使用连接、指代、词汇复现和信息顺序维持连贯。', canDo: '能组织较长文本，使段落关系清楚且少有跳跃。', topics: ['连接手段', '指代链', '词汇衔接', '已知—新信息'], prerequisites: ['b1-discourse-genres', 'b2-sentence-packaging'], lessonId: 'lesson-b2-discourse-cohesion' }),
  concept({ id: 'b2-discourse-genre', level: 'b2', domain: 'discourse', title: '正式邮件、报告与议论文', summary: '根据读者、目的和体裁选择结构与正式程度。', canDo: '能完成结构清晰、语域合适的正式实用和论述文本。', topics: ['正式邮件', '报告', '议论文', '语域与体裁'], prerequisites: ['b2-discourse-cohesion', 'b2-communication-argument'], lessonId: 'lesson-b2-discourse-genre' }),

  // C1 · 精确、灵活与复杂语篇
  concept({ id: 'c1-sentence-information', level: 'c1', domain: 'sentence', title: '信息结构、倒装与分裂句', summary: '通过改变正常顺序控制焦点、衔接和修辞强调。', canDo: '能根据上下文选择倒装、分裂句或常规语序突出重点。', topics: ['cleft sentences', 'fronting', 'negative inversion', '信息焦点'], prerequisites: ['b2-sentence-stance', 'b2-discourse-cohesion'], lessonId: 'lesson-c1-sentence-information' }),
  concept({ id: 'c1-grammar-modality', level: 'c1', domain: 'grammar', title: '高级情态、虚拟与立场控制', summary: '精确区分确定性、义务、推断、愿望和非现实立场。', canDo: '能灵活选择情态和虚拟形式表达细微立场。', topics: ['modal perfects', 'subjunctive', 'hypothetical distance', '立场强度'], prerequisites: ['b2-grammar-conditionals', 'b2-sentence-stance'], lessonId: 'lesson-c1-grammar-modality' }),
  concept({ id: 'c1-vocab-range', level: 'c1', domain: 'vocabulary', title: '广泛词汇、习语与专业表达', summary: '建立足以改述、绕开词缺并处理专业话题的词汇范围。', canDo: '能在一般和专业语境中灵活选词，明显减少搜索和重复。', topics: ['高阶搭配', '习语与口语化表达', '专业词汇', 'circumlocution'], prerequisites: ['b2-vocab-idiomatic', 'b2-vocab-precision'], lessonId: 'lesson-c1-vocab-range' }),
  concept({ id: 'c1-pronunciation-control', level: 'c1', domain: 'pronunciation', title: '语音控制与自我修正', summary: '稳定控制音、重音、节奏和语调，并在必要时自然修正。', canDo: '能持续产出清楚流畅的语音，偶尔失误不影响理解。', topics: ['音素精度', '流畅自我修正', '节奏稳定', '重音控制'], prerequisites: ['b2-pronunciation-rhythm', 'b2-pronunciation-focus'], lessonId: 'lesson-c1-pronunciation-control' }),
  concept({ id: 'c1-sentence-nominalisation', level: 'c1', domain: 'sentence', title: '名词化与高密度表达', summary: '在需要正式、客观和紧凑时把过程或判断包装为名词结构。', canDo: '能在正式语篇中适度使用名词化，同时保持可读性。', topics: ['nominalisation', '复杂名词短语', '抽象主语', '信息密度'], prerequisites: ['b2-sentence-packaging', 'b2-sentence-reduction'], lessonId: 'lesson-c1-sentence-nominalisation' }),
  concept({ id: 'c1-grammar-flexibility', level: 'c1', domain: 'grammar', title: '复杂结构的准确与灵活控制', summary: '在多种复杂结构之间选择最符合意义、风格和信息流的形式。', canDo: '能稳定控制复杂语法，并自然改写以消除歧义。', topics: ['从句嵌套', '结构替换', '省略与替代', '歧义消除'], prerequisites: ['c1-grammar-modality', 'c1-sentence-information'], lessonId: 'lesson-c1-grammar-flexibility' }),
  concept({ id: 'c1-vocab-nuance', level: 'c1', domain: 'vocabulary', title: '语义细微差异与词汇衔接', summary: '控制褒贬、强度、隐含意义和跨段落词汇关系。', canDo: '能选择表达细微语义和态度的词，并建立自然词汇链。', topics: ['connotation', '强度与程度', '隐喻', '词汇衔接'], prerequisites: ['c1-vocab-range', 'b2-discourse-cohesion'], lessonId: 'lesson-c1-vocab-nuance' }),
  concept({ id: 'c1-communication-nuance', level: 'c1', domain: 'communication', title: '细腻立场、外交表达与协商', summary: '在敏感或复杂互动中控制直接程度、承诺和人际关系。', canDo: '能得体表达保留、批评和不同意见，并促成共识。', topics: ['diplomatic language', '保留与限定', '委婉批评', '协商共识'], prerequisites: ['b2-communication-argument', 'c1-grammar-modality'], lessonId: 'lesson-c1-communication-nuance' }),
  concept({ id: 'c1-communication-mediate', level: 'c1', domain: 'communication', title: '综合信息与解释复杂概念', summary: '跨来源提炼信息，重组论点并根据听众调整解释。', canDo: '能综合多项复杂信息，清楚解释概念和不同立场。', topics: ['多源综合', '受众适配', '概念解释', '立场映射'], prerequisites: ['b2-communication-mediate', 'c1-vocab-nuance'], lessonId: 'lesson-c1-communication-mediate' }),
  concept({ id: 'c1-pronunciation-prosody', level: 'c1', domain: 'pronunciation', title: '韵律表达细微意义', summary: '利用重音、节奏和语调区分态度、强调和隐含关系。', canDo: '能通过韵律准确强化或限定自己要表达的意义。', topics: ['细微语调', '修辞重音', '态度韵律', '长段落分块'], prerequisites: ['c1-pronunciation-control'], lessonId: 'lesson-c1-pronunciation-prosody' }),
  concept({ id: 'c1-discourse-rhetoric', level: 'c1', domain: 'discourse', title: '复杂主题的修辞组织', summary: '围绕复杂主题安排引入、推进、转折、重点和结论。', canDo: '能产出结构流畅、重点明确的长篇口头或书面语篇。', topics: ['宏观结构', '主题推进', '修辞关系', '引入与结论'], prerequisites: ['b2-discourse-genre', 'c1-sentence-information'], lessonId: 'lesson-c1-discourse-rhetoric' }),
  concept({ id: 'c1-discourse-synthesis', level: 'c1', domain: 'discourse', title: '综合、评价与风格调整', summary: '整合多个来源，评价论证，并针对受众控制风格和语气。', canDo: '能写出来源关系清楚、评价有依据且风格一致的综合文本。', topics: ['综合写作', '评价证据', '来源关系', '风格与语气'], prerequisites: ['c1-discourse-rhetoric', 'c1-communication-mediate'], lessonId: 'lesson-c1-discourse-synthesis' }),
]

function conceptsForDomainWithPrerequisites(domain: LearningDomainId): string[] {
  const byId = new Map(LEARNING_CONCEPTS.map((item) => [item.id, item]))
  const included = new Set(LEARNING_CONCEPTS.filter((item) => item.domain === domain).map((item) => item.id))
  const includePrerequisites = (id: string) => {
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) {
      if (included.has(prerequisite)) continue
      included.add(prerequisite)
      includePrerequisites(prerequisite)
    }
  }
  for (const id of [...included]) includePrerequisites(id)
  return LEARNING_CONCEPTS.filter((item) => included.has(item.id)).map((item) => item.id)
}

export const LEARNING_ROUTES: LearningRoute[] = [
  {
    id: 'complete', title: '综合英语主干', description: '六大学科按阶段交织推进，形成完整的英语能力结构。',
    outcome: '从最小表达逐步发展到准确、连贯且适合语境的复杂沟通。',
    conceptIds: LEARNING_CONCEPTS.map((item) => item.id),
  },
  {
    id: 'sentence-building', title: '句子构建路线', description: '解决“知道单词，但不知道怎样组成句子”。',
    outcome: '能从意思出发，主动构建简单句、扩展句、复合句和复杂句。',
    conceptIds: conceptsForDomainWithPrerequisites('sentence'),
  },
  {
    id: 'grammar', title: '语法路线', description: '按前置关系理解英语形式为什么变化。',
    outcome: '能根据意义、时间、关系和语境主动选择语法形式。',
    conceptIds: conceptsForDomainWithPrerequisites('grammar'),
  },
  {
    id: 'vocabulary', title: '词汇路线', description: '按意义、搭配、词块、词族和语域建立词汇系统。',
    outcome: '不仅认识词，还能在真实语境中自然、准确地选择和组合。',
    conceptIds: conceptsForDomainWithPrerequisites('vocabulary'),
  },
  {
    id: 'communication', title: '沟通功能路线', description: '系统掌握完成不同交流任务所需的表达方式。',
    outcome: '能根据对象和场合完成提问、请求、解释、讨论和协商。',
    conceptIds: conceptsForDomainWithPrerequisites('communication'),
  },
  {
    id: 'pronunciation', title: '发音与听力路线', description: '从音和音节推进到连续语流、重音、节奏和语调。',
    outcome: '能听懂自然语流的关键变化，并用清楚韵律表达意义。',
    conceptIds: conceptsForDomainWithPrerequisites('pronunciation'),
  },
  {
    id: 'discourse', title: '语篇表达路线', description: '学习如何把句子组织成完整对话、段落和长篇表达。',
    outcome: '能根据目的和体裁组织故事、说明、报告、论证与综合文本。',
    conceptIds: conceptsForDomainWithPrerequisites('discourse'),
  },
]

export const CURRICULUM_REFERENCES = [
  {
    title: 'CEFR Companion Volume (2020)',
    url: 'https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2020/16809ea0d4',
    use: '阶段能力、沟通活动、语音、互动和语篇能力边界',
  },
  {
    title: 'English Profile',
    url: 'https://www.englishprofile.org/',
    use: '英语词汇与语法形式在 CEFR 阶段中的典型发展',
  },
  {
    title: 'British Council–EAQUALS Core Inventory',
    url: 'https://www.teachingenglish.org.uk/publications/case-studies-insights-and-research/british-council-eaquals-core-inventory-general',
    use: 'A1–C1 的核心语法、词汇、功能和语篇项目校准',
  },
]

export function validateLearningCurriculum(): void {
  const levelOrder = new Map(LEARNING_LEVELS.map((level, index) => [level.id, index]))
  const ids = new Set<string>()
  for (const item of LEARNING_CONCEPTS) {
    if (ids.has(item.id)) throw new Error(`Duplicate learning concept: ${item.id}`)
    ids.add(item.id)
  }
  for (const item of LEARNING_CONCEPTS) {
    for (const prerequisite of item.prerequisites) {
      if (!ids.has(prerequisite)) throw new Error(`Unknown prerequisite ${prerequisite} for ${item.id}`)
      const prerequisiteConcept = LEARNING_CONCEPTS.find((entry) => entry.id === prerequisite)
      if ((levelOrder.get(prerequisiteConcept?.level ?? 'pre_a1') ?? 0) > (levelOrder.get(item.level) ?? 0)) {
        throw new Error(`Later-level prerequisite ${prerequisite} for ${item.id}`)
      }
    }
  }
  for (const level of LEARNING_LEVELS) {
    for (const domain of LEARNING_DOMAINS) {
      if (!LEARNING_CONCEPTS.some((item) => item.level === level.id && item.domain === domain.id)) {
        throw new Error(`Curriculum gap: ${level.id}/${domain.id}`)
      }
    }
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const byId = new Map(LEARNING_CONCEPTS.map((item) => [item.id, item]))
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Learning prerequisite cycle at ${id}`)
    if (visited.has(id)) return
    visiting.add(id)
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) visit(prerequisite)
    visiting.delete(id)
    visited.add(id)
  }
  for (const id of ids) visit(id)
  for (const route of LEARNING_ROUTES) {
    if (route.conceptIds.length === 0) throw new Error(`Empty learning route: ${route.id}`)
    for (const id of route.conceptIds) {
      if (!ids.has(id)) throw new Error(`Unknown route concept ${id} in ${route.id}`)
      const item = byId.get(id)
      for (const prerequisite of item?.prerequisites ?? []) {
        if (!route.conceptIds.includes(prerequisite)) {
          throw new Error(`Route ${route.id} omits prerequisite ${prerequisite} for ${id}`)
        }
      }
    }
  }
}

validateLearningCurriculum()
