import { randomUUID } from 'node:crypto'
import type { FillBlankBreakdownItem, FillBlankCard, FillBlankFocus, FillBlankImitationGuide } from '../src/types'

type CardSeed = Omit<FillBlankCard, 'id'>

const IMITATION_REPLACEMENTS: Array<{ en: RegExp; enValue: string; zh: RegExp; zhValue: string }> = [
  { en: /\bhome\b/i, enValue: 'the library', zh: /家里|家中/, zhValue: '图书馆' },
  { en: /\bmilk\b/i, enValue: 'juice', zh: /牛奶/, zhValue: '果汁' },
  { en: /\bapples\b/i, enValue: 'oranges', zh: /苹果/, zhValue: '橙子' },
  { en: /\bbrother\b/i, enValue: 'cousin', zh: /哥哥/, zhValue: '表哥' },
  { en: /\byesterday\b/i, enValue: 'last weekend', zh: /昨天/, zhValue: '上周末' },
  { en: /\bdesk\b/i, enValue: 'shelf', zh: /桌子/, zhValue: '架子' },
  { en: /\blunch\b/i, enValue: 'dinner', zh: /午饭/, zhValue: '晚饭' },
  { en: /\bpencils\b/i, enValue: 'notebooks', zh: /铅笔/, zhValue: '笔记本' },
  { en: /\bbaby\b/i, enValue: 'puppy', zh: /宝宝/, zhValue: '小狗' },
  { en: /\btea\b/i, enValue: 'juice', zh: /茶/, zhValue: '果汁' },
  { en: /school bag/i, enValue: 'jacket', zh: /书包/, zhValue: '夹克' },
  { en: /\bfootball\b/i, enValue: 'basketball', zh: /足球/, zhValue: '篮球' },
  { en: /\bschool\b/i, enValue: 'the library', zh: /学校|上学/, zhValue: '图书馆' },
  { en: /\borange\b/i, enValue: 'sandwich', zh: /橙子/, zhValue: '三明治' },
  { en: /\bbanana\b/i, enValue: 'apple', zh: /香蕉/, zhValue: '苹果' },
  { en: /\bnoodles\b/i, enValue: 'soup', zh: /面条/, zhValue: '汤' },
  { en: /\bdoor\b/i, enValue: 'window', zh: /门/, zhValue: '窗户' },
  { en: /\bwater\b/i, enValue: 'tea', zh: /水/, zhValue: '茶' },
  { en: /\bnovel\b/i, enValue: 'article', zh: /小说/, zhValue: '文章' },
  { en: /\bmeeting\b/i, enValue: 'match', zh: /会议/, zhValue: '比赛' },
  { en: /\bpark\b/i, enValue: 'café', zh: /公园/, zhValue: '咖啡馆' },
  { en: /\bbus\b/i, enValue: 'train', zh: /公交车/, zhValue: '火车' },
  { en: /\bapp\b/i, enValue: 'camera', zh: /应用/, zhValue: '相机' },
  { en: /\bspace\b/i, enValue: 'history', zh: /太空/, zhValue: '历史' },
  { en: /\bbook\b/i, enValue: 'podcast', zh: /书|本书/, zhValue: '播客' },
  { en: /\bfilm\b/i, enValue: 'concert', zh: /电影/, zhValue: '音乐会' },
  { en: /\btrain\b/i, enValue: 'flight', zh: /火车/, zhValue: '航班' },
  { en: /\bquestion\b/i, enValue: 'instructions', zh: /题目|问题/, zhValue: '说明' },
  { en: /\bBeijing\b/, enValue: 'Shanghai', zh: /北京/, zhValue: '上海' },
  { en: /\bproposal\b/i, enValue: 'plan', zh: /提议/, zhValue: '计划' },
  { en: /\bresearch\b/i, enValue: 'report', zh: /研究/, zhValue: '报告' },
  { en: /\bcompany\b/i, enValue: 'school', zh: /公司/, zhValue: '学校' },
  { en: /\bproject\b/i, enValue: 'team', zh: /项目/, zhValue: '团队' },
]

const LEVEL_GUIDANCE: Record<string, string> = {
  kindergarten: 'ages 3-6; 3-6 words; concrete nouns and simple be/do sentences',
  primary_low: 'primary grades 1-3; 5-9 words; daily vocabulary and simple present/past tense',
  primary_high: 'primary grades 4-6; 8-14 words; conjunctions such as and, but, because',
  junior: 'junior high; about 1,500 common words; common tenses, modals and basic clauses',
  senior: 'senior high; Gaokao vocabulary; passive voice, relative and noun clauses',
  college: 'college CET-4/6; natural collocations, phrasal verbs and varied sentence patterns',
  ielts: 'IELTS/TOEFL; precise academic vocabulary, nuanced collocations and complex clauses',
}

const FOCUS_GUIDANCE: Record<FillBlankFocus, string> = {
  mixed: 'Mix both target types: about half vocabulary/collocation choices and half grammar/form choices. Set focusType accurately on each card.',
  vocabulary: 'Every card must have focusType "vocabulary". The answer must be a content word (noun, lexical verb, adjective or adverb) selected through meaning or a useful collocation. Do not use articles, pronouns, auxiliaries or conjunctions as blanks.',
  grammar: 'Every card must have focusType "grammar". Test a grammatical decision such as a verb form, tense marker, modal, preposition, conjunction, article or clause connector. Contrast the correct form with the likely wrong form.',
}

const FILL_CONTEXTS = [
  'morning or evening routines',
  'home tasks and shared responsibilities',
  'school, study, or workplace situations',
  'food preparation and meals',
  'transport, directions, or travel',
  'shopping and everyday services',
  'health, exercise, and useful habits',
  'technology, media, and communication',
  'plans, appointments, and local events',
  'weather, nature, and city life',
  'an everyday problem and its solution',
  'a decision, comparison, or simple opinion',
]

export function buildFillBlankPrompt(args: {
  count: number
  level: string
  focus: FillBlankFocus
  recentSentences: string[]
  diversitySeed?: number
}): { systemInstruction: string; userPrompt: string } {
  const levelGuide = LEVEL_GUIDANCE[args.level] ?? LEVEL_GUIDANCE.junior
  const diversitySeed = Number.isSafeInteger(args.diversitySeed) ? Math.abs(args.diversitySeed as number) : 0
  const contextPlan = Array.from(
    { length: Math.min(args.count, FILL_CONTEXTS.length) },
    (_, index) => FILL_CONTEXTS[(diversitySeed + index) % FILL_CONTEXTS.length],
  ).join('; ')
  const avoid = args.recentSentences.length
    ? args.recentSentences.map((sentence, index) => `${index + 1}. ${sentence}`).join('\n')
    : '(none)'
  return {
    systemInstruction: `You create high-quality English cloze exercises for Chinese learners. Return only one valid JSON object and no markdown. Every exercise must be natural, unambiguous and pedagogically useful.`,
    userPrompt: `Create exactly ${args.count} different English fill-in-the-blank cards.

Learner level: ${levelGuide}.
Practice focus: ${FOCUS_GUIDANCE[args.focus]}.
Context plan: ${contextPlan}.

Requirements for every card:
- "sentence" is a natural English sentence containing the literal marker {{blank}} exactly once.
- "answer" is exactly one English word and completes the sentence unambiguously.
- "translation" is the complete Chinese translation without a blank.
- "phonetic" is the answer's IPA; "partOfSpeech" and "definition" are concise Chinese learning notes.
- "hint" helps recall the word but must not reveal its spelling.
- "grammarPoint" names the grammar/collocation; "structure" breaks down the sentence pattern; "explanation" explains in concise Simplified Chinese why the answer fits.
- "focusType" is exactly "vocabulary" or "grammar" and matches what the blank actually tests.
- "breakdown" contains 3-6 ordered chunks that together cover the entire completed sentence. Each "text" quotes exact consecutive words from this sentence; "role" names its specific job; "explanation" explains in Simplified Chinese what that exact chunk means and why it is placed there. Do not use vague labels without explaining the current sentence.
- "imitation.steps" contains 2-4 concrete replacement steps for making a learner's own sentence from this exact pattern. "imitation.example" is a new English example using the same pattern, with its Chinese "translation". "imitation.caution" gives one likely error and the corrected form.
- Vary subjects, sentence openings, tenses and contexts. Do not repeat a sentence or merely swap one noun.
- Use the context plan in order before reusing a context family. Do not put more than two cards in the same setting or sentence frame.
- Do not default to pets, colors, or "favorite things" as beginner content unless the requested language point requires it.
- Infer recurring topics and sentence frames from the avoid list. Do not reproduce them, closely paraphrase them, or merely swap one noun.
- Keep every teaching field concise. The goal is a usable lesson, not a long essay.

Avoid list:
${avoid}

Return this shape:
{"cards":[{"sentence":"... {{blank}} ...","translation":"...","answer":"...","phonetic":"/.../","partOfSpeech":"...","definition":"...","hint":"...","grammarPoint":"...","structure":"...","explanation":"...","focusType":"vocabulary","breakdown":[{"text":"exact words","role":"具体作用","explanation":"这部分在本句中的含义和位置"}],"imitation":{"steps":["先保留……","再替换……"],"example":"A new sentence.","translation":"一个新句子。","caution":"常见错误 → 正确形式"}}]}`,
  }
}

const BEGINNER_BANK: CardSeed[] = [
  seed('The bus {{blank}} beside our school.', '公交车停在我们学校旁边。', 'stops', '/stɒps/', '动词', '停下', '表示车辆停止移动', '一般现在时', '主语 + 动词 + 地点', '主语 the bus 是第三人称单数，因此 stop 要加 -s。'),
  seed('I {{blank}} milk every morning.', '我每天早上喝牛奶。', 'drink', '/drɪŋk/', '动词', '喝', '把液体送入口中', '一般现在时', '主语 + 动词 + 宾语 + 时间', 'every morning 表示习惯，主语 I 后使用动词原形。'),
  seed('These apples {{blank}} red and sweet.', '这些苹果又红又甜。', 'are', '/ɑːr/', '动词', '是', 'be 动词的复数形式', '主谓一致', '复数主语 + be + 形容词', 'These apples 是复数，所以 be 动词使用 are。'),
  seed('My brother can {{blank}} very fast.', '我哥哥能跑得很快。', 'run', '/rʌn/', '动词', '跑', '用双脚快速移动', '情态动词 can', '主语 + can + 动词原形 + 副词', 'can 后必须接动词原形。'),
  seed('We {{blank}} a picture yesterday.', '我们昨天画了一幅画。', 'drew', '/druː/', '动词', '画（draw 的过去式）', '用笔创造图画', '一般过去时', '主语 + 过去式 + 宾语 + 过去时间', 'yesterday 表明动作发生在过去，draw 的过去式是 drew。'),
  seed('There {{blank}} a book on the desk.', '桌子上有一本书。', 'is', '/ɪz/', '动词', '有；是', '与单数名词搭配的 be 动词', 'there be 句型', 'There + be + 名词 + 地点', 'a book 是单数，因此使用 There is。'),
  seed('Please {{blank}} your hands before lunch.', '午饭前请洗手。', 'wash', '/wɒʃ/', '动词', '洗', '用水清洁', '祈使句', 'Please + 动词原形 + 宾语', '祈使句用动词原形开头，wash hands 是常用搭配。'),
  seed('She {{blank}} two yellow pencils.', '她有两支黄色铅笔。', 'has', '/hæz/', '动词', '有', '表示拥有', '第三人称单数', '主语 + have/has + 宾语', '主语 she 是第三人称单数，have 要变为 has。'),
  seed('The baby is {{blank}} now.', '宝宝现在正在睡觉。', 'sleeping', '/ˈsliːpɪŋ/', '动词', '正在睡觉', '闭眼休息的动作正在发生', '现在进行时', '主语 + be + 动词-ing', 'is 与 sleeping 构成现在进行时，表示此刻正在发生。'),
  seed('I like tea, {{blank}} I do not like coffee.', '我喜欢茶，但我不喜欢咖啡。', 'but', '/bʌt/', '连词', '但是', '连接意思相反的两部分', '转折连词', '分句 + but + 分句', '前后表达相反的喜好，因此用 but 表示转折。'),
  seed('Grandma {{blank}} us a story after dinner.', '奶奶晚饭后给我们讲故事。', 'tells', '/telz/', '动词', '讲述', '把故事说给别人听', '第三人称单数', '主语 + 动词 + 人 + 事物 + 时间', '主语 Grandma 是第三人称单数，因此 tell 要加 -s。'),
  seed('They {{blank}} football after school.', '他们放学后踢足球。', 'play', '/pleɪ/', '动词', '玩；进行（球类运动）', '和 football 构成常用搭配', '一般现在时', '主语 + 动词 + 运动 + 时间', 'play football 是固定搭配，复数主语 they 后用原形。'),
  seed('The sun {{blank}} brightly today.', '今天阳光灿烂。', 'shines', '/ʃaɪnz/', '动词', '照耀', '太阳发出明亮的光', '一般现在时', '单数主语 + 动词第三人称单数 + 副词', '主语 the sun 是第三人称单数，所以 shine 要加 -s。'),
  seed('We {{blank}} to school by bus.', '我们乘公交车去上学。', 'go', '/ɡəʊ/', '动词', '去', '从一个地方前往另一个地方', '一般现在时', '主语 + 动词 + 地点 + 方式', '主语 we 后使用动词原形，go to school 是常用表达。'),
  seed('He is {{blank}} an orange.', '他正在吃一个橙子。', 'eating', '/ˈiːtɪŋ/', '动词', '正在吃', '把食物送入口中', '现在进行时', '主语 + be + 动词-ing + 宾语', 'is 与 eating 构成现在进行时，表示动作正在发生。'),
  seed('Can I {{blank}} the window?', '我可以打开窗户吗？', 'open', '/ˈəʊpən/', '动词', '打开', '让关闭的东西不再关闭', '情态动词 can', 'Can + 主语 + 动词原形 + 宾语', 'can 后接动词原形，open the window 是自然搭配。'),
  seed('This key {{blank}} the small door.', '这把钥匙能打开那扇小门。', 'opens', '/ˈəʊpənz/', '动词', '打开', '让关闭的东西可以进入', '第三人称单数', '主语 + 动词 + 宾语', '主语 This key 是第三人称单数，因此 open 要加 -s。'),
  seed('A bird has two {{blank}}.', '一只鸟有两只翅膀。', 'wings', '/wɪŋz/', '名词', '翅膀', '鸟用它们飞翔', '可数名词复数', '主语 + has + 数词 + 复数名词', 'two 后接可数名词复数，所以使用 wings。'),
  seed('Dad {{blank}} noodles for dinner.', '爸爸晚餐煮了面条。', 'cooked', '/kʊkt/', '动词', '烹饪（过去式）', '用热量制作食物', '一般过去时', '主语 + 过去式 + 宾语 + 用餐时间', '晚餐已经完成，cook 的过去式是 cooked。'),
  seed('Please {{blank}} the door quietly.', '请轻轻地关上门。', 'close', '/kləʊz/', '动词', '关闭', '让门不再打开', '祈使句', 'Please + 动词原形 + 宾语 + 副词', '祈使句在 please 后使用动词原形。'),
]

const BASIC_BANK: CardSeed[] = [
  seed('I stayed at home {{blank}} it was raining.', '因为下雨，我待在家里。', 'because', '/bɪˈkɒz/', '连词', '因为', '引出事情发生的原因', '原因状语从句', '主句 + because + 原因从句', '后半句解释待在家的原因，所以使用 because。'),
  seed('You should {{blank}} enough water after exercise.', '运动后你应该喝足够的水。', 'drink', '/drɪŋk/', '动词', '喝', '与 water 搭配的动作', '情态动词 should', '主语 + should + 动词原形 + 宾语', 'should 后接动词原形，drink water 是自然搭配。'),
  seed('She has {{blank}} this novel twice.', '她已经读过这本小说两遍了。', 'read', '/red/', '动词', '读（过去分词）', '完成阅读这一动作', '现在完成时', '主语 + has + 过去分词 + 宾语', 'has 后需要过去分词；read 的过去分词拼写不变，读音为 /red/。'),
  seed('The meeting was {{blank}} because of the storm.', '会议因为暴风雨被取消了。', 'canceled', '/ˈkænsəld/', '动词', '取消', '使原定活动不再举行', '一般过去时的被动语态', '主语 + was + 过去分词 + 原因', '会议是被取消的，因此使用 was canceled。'),
  seed('This is the park {{blank}} we first met.', '这就是我们第一次见面的公园。', 'where', '/weə(r)/', '关系副词', '在……的地方', '指代前面的地点', '定语从句', '地点名词 + where + 主语 + 动词', '先行词 park 是地点，从句缺少地点状语，所以用 where。'),
  seed('If you leave now, you {{blank}} catch the bus.', '如果你现在出发，你就会赶上公交车。', 'will', '/wɪl/', '情态动词', '将会', '表示条件成立后的结果', '第一条件句', 'If + 一般现在时，主句 + will + 动词原形', '真实可能的条件句中，主句常用 will 表示结果。'),
  seed('Could you {{blank}} me how to use this app?', '你能告诉我怎样使用这个应用吗？', 'show', '/ʃəʊ/', '动词', '展示；教', '通过演示让人明白', '双宾语结构', 'show + 人 + how to do', 'show someone how to do something 表示“教某人如何做某事”。'),
  seed('Tom is interested {{blank}} learning about space.', '汤姆对了解太空感兴趣。', 'in', '/ɪn/', '介词', '在；对于', '与 interested 构成固定搭配', '形容词搭配', 'be interested in + 名词/动名词', 'interested in 是固定搭配，后接 learning。'),
  seed('Neither answer {{blank}} completely correct.', '两个答案都不完全正确。', 'is', '/ɪz/', '动词', '是', '与 neither 搭配的 be 动词', '主谓一致', 'Neither + 单数名词 + 单数谓语', 'neither 作主语时通常视为单数，因此使用 is。'),
  seed('The book was so interesting {{blank}} I finished it in one day.', '这本书太有趣了，所以我一天就读完了。', 'that', '/ðæt/', '连词', '以至于', '引出程度造成的结果', '结果状语从句', 'so + 形容词 + that + 结果', 'so ... that ... 表示“如此……以至于……”。'),
  seed('I would rather walk {{blank}} take a crowded bus.', '我宁愿走路也不愿坐拥挤的公交车。', 'than', '/ðæn/', '连词', '而不是', '用于比较两种选择', 'would rather 句型', 'would rather do A than do B', 'would rather ... than ... 表示“宁愿……也不……”。'),
  seed('By the time we arrived, the film had {{blank}}.', '我们到达时，电影已经开始了。', 'started', '/ˈstɑːtɪd/', '动词', '开始（过去分词）', '在另一个过去动作前发生', '过去完成时', '主语 + had + 过去分词', '电影开始发生在“到达”之前，所以使用 had started。'),
  seed('{{blank}} I was studying, my phone rang.', '我学习的时候，手机响了。', 'While', '/waɪl/', '连词', '当……时', '连接同时发生的动作', '时间状语从句', 'While + 过去进行时，主句 + 一般过去时', '持续的学习动作被电话铃声打断，因此使用 while。'),
  seed('She practices daily so {{blank}} she can improve.', '她每天练习，以便能够进步。', 'that', '/ðæt/', '连词', '以便', '与 so 构成目的表达', '目的状语从句', '主句 + so that + 目的从句', 'so that 表示“以便”，引出练习的目的。'),
  seed('The homework must be {{blank}} before Friday.', '作业必须在周五前完成。', 'finished', '/ˈfɪnɪʃt/', '动词', '完成（过去分词）', '让任务全部做完', '情态动词的被动语态', '主语 + must be + 过去分词', '作业是被完成的，所以使用 must be finished。'),
  seed('He used to {{blank}} near the library.', '他过去住在图书馆附近。', 'live', '/lɪv/', '动词', '居住', '长期在某个地方生活', 'used to 句型', '主语 + used to + 动词原形 + 地点', 'used to 后接动词原形，表示过去经常发生的状态。'),
  seed('{{blank}} you hurry, you will miss the train.', '除非你快一点，否则会错过火车。', 'Unless', '/ənˈles/', '连词', '除非', '表示如果某个条件不成立', '条件状语从句', 'Unless + 一般现在时，主句 + will', 'unless 相当于 if ... not，引出避免错过火车的条件。'),
  seed('The teacher asked {{blank}} we understood the rule.', '老师问我们是否理解这条规则。', 'whether', '/ˈweðə(r)/', '连词', '是否', '引出有两种可能的疑问', '宾语从句', '动词 + whether + 陈述语序从句', 'asked 后用 whether 引出“是否理解”的间接疑问。'),
  seed('Please read the question more {{blank}}.', '请更仔细地阅读题目。', 'carefully', '/ˈkeəfəli/', '副词', '仔细地', '以认真、避免错误的方式', '副词修饰动词', '动词 + 宾语 + more + 副词', 'read 是动词，需要用副词 carefully 描述阅读方式。'),
  seed('Have you ever {{blank}} to Beijing?', '你曾经去过北京吗？', 'been', '/biːn/', '动词', '去过（be 的过去分词）', '表示曾有到访经历', '现在完成时', 'Have + 主语 + ever + 过去分词 + 地点', 'have been to 表示“曾经去过某地”。'),
]

const ADVANCED_BANK: CardSeed[] = [
  seed('The proposal deserves careful {{blank}} before we make a decision.', '在作出决定前，这项提议值得仔细考虑。', 'consideration', '/kənˌsɪdəˈreɪʃn/', '名词', '考虑', '认真思考某件事的过程', '名词搭配', 'deserve + 形容词 + 名词 + before 从句', 'careful 修饰名词，consideration 与 proposal 构成自然搭配。'),
  seed('Rarely {{blank}} we encounter such a convincing argument.', '我们很少遇到如此有说服力的论点。', 'do', '/duː/', '助动词', '用于构成倒装', '放在主语前帮助谓语倒装', '否定副词置首倒装', 'Rarely + 助动词 + 主语 + 动词原形', 'Rarely 位于句首时，主句需要部分倒装，因此使用 do。'),
  seed('The research highlights the need {{blank}} more inclusive policies.', '这项研究强调了制定更具包容性政策的必要性。', 'for', '/fɔː(r)/', '介词', '对于；为了', '与 need 构成固定搭配', '名词搭配', 'the need for + 名词', 'the need for 是常见搭配，表示“对……的需要”。'),
  seed('Had I known the schedule, I would have {{blank}} earlier.', '如果我知道日程安排，我就会更早到达。', 'arrived', '/əˈraɪvd/', '动词', '到达（过去分词）', '到达某个地点', '虚拟条件句倒装', 'Had + 主语 + 过去分词，主语 + would have + 过去分词', 'would have 后接过去分词，表达与过去事实相反的结果。'),
  seed('Her explanation was clear, concise, and highly {{blank}}.', '她的解释清晰、简洁，而且非常有说服力。', 'persuasive', '/pəˈsweɪsɪv/', '形容词', '有说服力的', '能够使别人相信或行动', '平行结构', '形容词 + 形容词 + and + 副词 + 形容词', '并列成分应保持词性一致，这里需要形容词 persuasive。'),
  seed('No sooner had the train left {{blank}} it began to snow.', '火车刚离开，天就开始下雪了。', 'than', '/ðæn/', '连词', '就；比', '连接两个紧接发生的动作', 'No sooner...than', 'No sooner + 过去完成时 + than + 一般过去时', 'No sooner ... than ... 是固定句型，表示“一……就……”。'),
  seed('The policy may have unintended {{blank}} for small businesses.', '这项政策可能会给小企业带来意想不到的后果。', 'consequences', '/ˈkɒnsɪkwənsɪz/', '名词', '后果', '某个行动产生的结果', '词汇搭配', 'unintended + consequences + for', 'unintended consequences 是高频搭配，常指未预料到的结果。'),
  seed('What matters is not speed but {{blank}}.', '重要的不是速度，而是准确性。', 'accuracy', '/ˈækjərəsi/', '名词', '准确性', '正确且没有错误的程度', 'not...but... 平行结构', 'not + 名词 + but + 名词', 'but 后需用与 speed 平行的名词，accuracy 符合语义。'),
  seed('The evidence is insufficient to {{blank}} such a broad conclusion.', '这些证据不足以支持如此宽泛的结论。', 'support', '/səˈpɔːt/', '动词', '支持；证实', '为观点提供依据', '形容词 + 不定式', 'be insufficient + to + 动词原形', 'to 后接动词原形；support a conclusion 表示“支持结论”。'),
  seed('Not only did she identify the problem, but she also {{blank}} a solution.', '她不仅指出了问题，还提出了解决方案。', 'proposed', '/prəˈpəʊzd/', '动词', '提出', '把计划或想法正式说出', 'not only...but also', 'Not only 倒装分句 + but also 正常语序分句', '第二个分句保持一般过去时，用 proposed 与 did identify 呼应。'),
  seed('Digital literacy is increasingly {{blank}} as an essential workplace skill.', '数字素养越来越被视为一项必备的职场技能。', 'regarded', '/rɪˈɡɑːdɪd/', '动词', '视为', '以某种方式看待', '被动语态搭配', 'be regarded as + 名词', 'be regarded as 是固定被动搭配，表示“被视为”。'),
  seed('Although the task was demanding, the team remained {{blank}} to its goal.', '尽管任务艰巨，团队仍然致力于自己的目标。', 'committed', '/kəˈmɪtɪd/', '形容词', '坚定投入的', '愿意长期付出努力', '形容词搭配', 'remain committed to + 名词', 'committed to 表示“致力于”，remain 后接形容词作表语。'),
  seed('{{blank}} limited resources, the project delivered meaningful results.', '尽管资源有限，该项目仍取得了有意义的成果。', 'Despite', '/dɪˈspaɪt/', '介词', '尽管', '表示让步关系', '介词引导让步', 'Despite + 名词短语，主句', 'despite 后直接接名词短语，不需要再加 of。'),
  seed('The decline was largely {{blank}} to changing consumer habits.', '这一下降主要归因于消费者习惯的变化。', 'attributable', '/əˈtrɪbjətəbl/', '形容词', '可归因于', '能够由某个原因解释', '形容词搭配', 'be attributable to + 名词', 'attributable to 是固定搭配，表示“可归因于”。'),
  seed('Excessive regulation may {{blank}} innovation.', '过度监管可能会削弱创新。', 'undermine', '/ˌʌndəˈmaɪn/', '动词', '逐渐削弱', '使某事变得不那么有效', '情态动词后接原形', '主语 + may + 动词原形 + 宾语', 'may 后使用动词原形，undermine innovation 是自然搭配。'),
  seed('The report, {{blank}} was published yesterday, challenges that assumption.', '昨天发布的报告对这一假设提出了质疑。', 'which', '/wɪtʃ/', '关系代词', '……的那个', '指代前面的事物并引出补充信息', '非限制性定语从句', '名词，which + 谓语，主句', '逗号后的从句补充说明 report，因此用 which。'),
  seed('{{blank}} completed the survey, participants received a short report.', '完成调查后，参与者收到了一份简短报告。', 'Having', '/ˈhævɪŋ/', '助动词', '已经', '表示一个动作先于主句动作完成', '完成式分词', 'Having + 过去分词，主句', '调查先完成，随后收到报告，因此使用 Having completed。'),
  seed('Urban incomes rose, {{blank}} rural wages remained stable.', '城市收入上升，而农村工资保持稳定。', 'whereas', '/ˌweərˈæz/', '连词', '然而；而', '对比两个不同事实', '对比从句', '分句 + whereas + 分句', '前后数据形成鲜明对比，因此使用 whereas。'),
  seed('The rule applies {{blank}} of a candidate\'s background.', '无论候选人的背景如何，这条规则都适用。', 'regardless', '/rɪˈɡɑːdləs/', '副词', '不考虑；不管', '表示条件不会改变结果', '固定搭配', 'apply regardless of + 名词', 'regardless of 是固定搭配，表示“不管……”。'),
  seed('Should demand {{blank}}, the company will expand production.', '如果需求增加，公司将扩大生产。', 'increase', '/ɪnˈkriːs/', '动词', '增加', '数量或程度变得更大', '虚拟条件句倒装', 'Should + 主语 + 动词原形，主句', '省略 if 的条件倒装中，should 后接动词原形。'),
]

function seed(
  sentence: string, translation: string, answer: string, phonetic: string,
  partOfSpeech: string, definition: string, hint: string, grammarPoint: string,
  structure: string, explanation: string,
): CardSeed {
  const teaching = buildFallbackTeaching({ sentence, translation, answer, partOfSpeech, definition, grammarPoint, structure, explanation })
  return {
    sentence, translation, answer, phonetic, partOfSpeech, definition, hint, grammarPoint, structure, explanation,
    focusType: inferFallbackFocus(partOfSpeech, grammarPoint),
    ...teaching,
  }
}

function inferFallbackFocus(partOfSpeech: string, grammarPoint: string): FillBlankCard['focusType'] {
  return /介词|连词|助动词|冠词|代词|时态|语态|从句|主谓|情态|倒装|句型|分词|不定式/.test(`${partOfSpeech} ${grammarPoint}`)
    ? 'grammar'
    : 'vocabulary'
}

function buildFallbackTeaching(args: {
  sentence: string
  translation: string
  answer: string
  partOfSpeech: string
  definition: string
  grammarPoint: string
  structure: string
  explanation: string
}): { breakdown: FillBlankBreakdownItem[]; imitation: FillBlankImitationGuide } {
  const [before, after] = args.sentence.split('{{blank}}')
  const breakdown: FillBlankBreakdownItem[] = []
  if (before.trim()) {
    breakdown.push({
      text: before.trim(),
      role: '答案前的语境',
      explanation: '先确认这里已经给出的主语、动作状态或句子关系，它决定空格需要承担什么作用。',
    })
  }
  breakdown.push({
    text: args.answer,
    role: `${args.partOfSpeech} · 本题关键`,
    explanation: `${args.definition}。${args.explanation}`,
  })
  if (after.trim()) {
    breakdown.push({
      text: after.trim(),
      role: '答案后的信息',
      explanation: '这一部分补充对象、状态、地点、时间或原因，用来反向验证答案是否同时符合语义和结构。',
    })
  }
  const completed = args.sentence.replace('{{blank}}', args.answer)
  const replacement = IMITATION_REPLACEMENTS.find((item) => item.en.test(completed) && item.zh.test(args.translation))
  const example = replacement ? completed.replace(replacement.en, replacement.enValue) : ''
  const exampleTranslation = replacement ? args.translation.replace(replacement.zh, replacement.zhValue) : ''
  return {
    breakdown,
    imitation: {
      steps: [
        `先保留骨架“${args.structure}”。`,
        '把主语换成自己、家人或熟悉的人，并同步检查谓语形式。',
        `再替换答案附近的动作、对象、地点或时间，最后按“${args.grammarPoint}”检查。`,
      ],
      example,
      translation: exampleTranslation,
      caution: `不要只替换单词而忽略主谓一致、时态或固定搭配；写完后按“${args.grammarPoint}”复查。`,
    },
  }
}

function normalizeBreakdown(value: unknown): FillBlankBreakdownItem[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 6).flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const entry = item as Record<string, unknown>
    const text = clean(entry.text, '')
    const role = clean(entry.role, '')
    const explanation = clean(entry.explanation, '')
    return text && role && explanation ? [{ text, role, explanation }] : []
  })
}

function normalizeImitation(value: unknown): FillBlankImitationGuide {
  if (typeof value !== 'object' || value === null) {
    return { steps: [], example: '', translation: '', caution: '' }
  }
  const entry = value as Record<string, unknown>
  const steps = Array.isArray(entry.steps)
    ? entry.steps.map((step) => clean(step, '')).filter(Boolean).slice(0, 4)
    : []
  return {
    steps,
    example: clean(entry.example, ''),
    translation: clean(entry.translation, ''),
    caution: clean(entry.caution, ''),
  }
}

function clean(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export function sentenceKey(sentence: string): string {
  return sentence.toLowerCase().replace(/\{\{blank\}\}/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function completeSentence(card: Pick<FillBlankCard, 'sentence' | 'answer'>): string {
  return card.sentence.replace('{{blank}}', card.answer)
}

export function normalizeGeneratedCards(raw: unknown, requestedFocus: FillBlankFocus = 'mixed'): FillBlankCard[] {
  if (typeof raw !== 'object' || raw === null || !Array.isArray((raw as { cards?: unknown }).cards)) return []
  const cards: FillBlankCard[] = []
  const seen = new Set<string>()
  for (const item of (raw as { cards: unknown[] }).cards) {
    if (typeof item !== 'object' || item === null) continue
    const value = item as Record<string, unknown>
    const answer = clean(value.answer, '').replace(/[.!?,;:]$/, '')
    if (!/^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(answer)) continue
    let sentence = clean(value.sentence, '')
    if (!sentence.includes('{{blank}}')) {
      const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      sentence = sentence.replace(new RegExp(`\\b${escaped}\\b`, 'i'), '{{blank}}')
    }
    if ((sentence.match(/\{\{blank\}\}/g) ?? []).length !== 1) continue
    const key = sentenceKey(sentence.replace('{{blank}}', answer))
    if (!key || seen.has(key)) continue
    seen.add(key)
    const partOfSpeech = clean(value.partOfSpeech, '单词')
    const definition = clean(value.definition, '结合句子理解词义')
    const grammarPoint = clean(value.grammarPoint, '句子语境')
    const structure = clean(value.structure, '结合主语、谓语和上下文判断')
    const explanation = clean(value.explanation, '该词在语义和句子结构上都符合此处用法。')
    const focusType = value.focusType === 'grammar' || value.focusType === 'vocabulary'
      ? value.focusType
      : requestedFocus === 'grammar' ? 'grammar' : 'vocabulary'
    if (requestedFocus !== 'mixed' && focusType !== requestedFocus) continue
    const breakdown = normalizeBreakdown(value.breakdown)
    const imitation = normalizeImitation(value.imitation)
    const breakdownCoversSentence = sentenceKey(breakdown.map((chunk) => chunk.text).join(' ')) === key
    const teachingIsComplete = breakdown.length >= 3 && breakdownCoversSentence && imitation.steps.length >= 2
      && imitation.example && imitation.translation && imitation.caution
    if (!teachingIsComplete) continue
    cards.push({
      id: randomUUID(), sentence, answer,
      translation: clean(value.translation, '请结合英文句子理解句意。'),
      phonetic: clean(value.phonetic, ''), partOfSpeech, definition,
      hint: clean(value.hint, `共 ${answer.length} 个字母`),
      grammarPoint, structure, explanation, focusType,
      breakdown, imitation,
    })
  }
  return cards
}

export function fallbackFillBlankCards(level: string, focus: FillBlankFocus = 'mixed', diversitySeed = 0): FillBlankCard[] {
  const bank = level === 'kindergarten' || level === 'primary_low'
    ? BEGINNER_BANK
    : level === 'senior' || level === 'college' || level === 'ielts'
      ? ADVANCED_BANK
      : BASIC_BANK
  const rotate = (cards: CardSeed[]) => {
    if (cards.length === 0) return cards
    const offset = Math.abs(diversitySeed) % cards.length
    return [...cards.slice(offset), ...cards.slice(0, offset)]
  }
  const ordered = focus === 'mixed'
    ? rotate(bank)
    : [
        ...rotate(bank.filter((card) => card.focusType === focus)),
        ...rotate(bank.filter((card) => card.focusType !== focus)),
      ]
  return ordered.map((card) => ({ ...card, id: randomUUID() }))
}

export function selectUniqueCards(args: {
  generated: FillBlankCard[]
  fallback: FillBlankCard[]
  count: number
  recentSentences: string[]
}): FillBlankCard[] {
  const recent = new Set(args.recentSentences.map(sentenceKey))
  const selected: FillBlankCard[] = []
  const selectedKeys = new Set<string>()
  const patternCounts = new Map<string, number>()
  const add = (card: FillBlankCard, respectHistory: boolean, respectPatterns: boolean) => {
    const key = sentenceKey(completeSentence(card))
    const pattern = sentenceKey(`${card.grammarPoint} ${card.structure}`)
    if (!key || selectedKeys.has(key) || (respectHistory && recent.has(key))) return
    if (respectPatterns && (patternCounts.get(pattern) ?? 0) >= 2) return
    selectedKeys.add(key)
    patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1)
    selected.push(card)
  }
  for (const card of args.generated) add(card, true, true)
  for (const card of args.fallback) add(card, true, true)
  // If the learner has already seen the entire local backup bank, preserve the
  // requested card count while still preferring structural variety.
  for (const card of args.generated) add(card, false, true)
  for (const card of args.fallback) add(card, false, true)
  if (args.fallback.length > 0) {
    for (const card of args.fallback) add(card, false, false)
    for (const card of args.generated) add(card, false, false)
  }
  return selected.slice(0, args.count)
}
