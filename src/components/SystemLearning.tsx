import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Circle, Clock3,
  GraduationCap, HelpCircle, LoaderCircle, RotateCcw, Route, ShieldCheck, Sparkles, Volume2, X,
} from 'lucide-react'
import {
  CURRICULUM_REFERENCES, LEARNING_CONCEPTS, LEARNING_DOMAINS, LEARNING_LEVELS, LEARNING_ROUTES,
} from '../data/learningCurriculum'
import type { LearningConcept } from '../data/learningCurriculum'
import type { LearningActivity, LearningLesson, MasteryDimension } from '../data/learningLessons'
import { useSystemLearning } from '../hooks/useSystemLearning'
import type { ConceptLearningProgress } from '../hooks/useSystemLearning'
import { evaluateLearningAnswer, generateLearningPractice } from '../lib/api'
import type { LearningEvaluationResult } from '../lib/api'
import type { SpeechPlayer } from '../lib/speech'
import { incrementStoredCounter, loadStoredJson, saveStoredJson } from '../lib/storage'
import type { AskContext } from '../types'

type LearningView = 'home' | 'routes' | 'review'

const DIMENSIONS: Array<{ id: MasteryDimension; label: string }> = [
  { id: 'recognition', label: '识别' }, { id: 'understanding', label: '理解' },
  { id: 'construction', label: '构建' }, { id: 'application', label: '运用' },
]
const PRACTICE_VARIETY_KEY = 'lingolevel_learning_practice_variety'
const PRACTICE_HISTORY_KEY = 'lingolevel_learning_practice_history'

function loadPracticeHistory(conceptId: string): string[] {
  const history = loadStoredJson<Record<string, string[]>>(PRACTICE_HISTORY_KEY, {})
  return Array.isArray(history[conceptId]) ? history[conceptId].slice(-20) : []
}

function savePracticeHistory(conceptId: string, prompts: string[]): void {
  const history = loadStoredJson<Record<string, string[]>>(PRACTICE_HISTORY_KEY, {})
  saveStoredJson(PRACTICE_HISTORY_KEY, { ...history, [conceptId]: [...(history[conceptId] ?? []), ...prompts].slice(-20) })
}

function StatusMark({ progress }: { progress: ConceptLearningProgress }) {
  if (progress.status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
  if (progress.status === 'learning') return <Circle className="h-4 w-4 fill-amber-400 text-amber-400" />
  return <Circle className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />
}

function LearningSidebar({ view, setView, dueCount }: { view: LearningView; setView: (view: LearningView) => void; dueCount: number }) {
  const items: Array<{ id: LearningView; label: string; icon: typeof BookOpen }> = [
    { id: 'home', label: '我的学习', icon: BookOpen },
    { id: 'routes', label: '课程目录', icon: Route },
    { id: 'review', label: '智能复习', icon: RotateCcw },
  ]
  return (
    <aside className="shrink-0 border-b border-stone-200 bg-stone-100/70 dark:border-zinc-800 dark:bg-zinc-900/40 lg:w-52 lg:border-b-0 lg:border-r">
      <div className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:p-4">
        <p className="hidden px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400 lg:block">系统学习</p>
        {items.map((item) => {
          const Icon = item.icon
          return <button key={item.id} type="button" onClick={() => setView(item.id)}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition lg:w-full ${view === item.id ? 'bg-white text-indigo-700 shadow-sm dark:bg-zinc-800 dark:text-indigo-300' : 'text-zinc-600 hover:bg-white/70 dark:text-zinc-400 dark:hover:bg-zinc-800/70'}`}>
            <Icon className="h-4 w-4" /><span>{item.label}</span>
            {item.id === 'review' && dueCount > 0 && <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-300">{dueCount}</span>}
          </button>
        })}
      </div>
    </aside>
  )
}

function ConceptRow({ concept, progress, onOpen }: { concept: LearningConcept; progress: ConceptLearningProgress; onOpen: () => void }) {
  const domain = LEARNING_DOMAINS.find((item) => item.id === concept.domain)
  return <button type="button" onClick={onOpen} className="group flex w-full items-center gap-3 border-b border-stone-200 px-1 py-3 text-left last:border-b-0 dark:border-zinc-800">
    <StatusMark progress={progress} />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-zinc-900 group-hover:text-indigo-700 dark:text-zinc-100 dark:group-hover:text-indigo-300">{concept.title}</span>
      <span className="mt-0.5 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">{domain?.shortTitle} · {concept.canDo}</span>
    </span>
    {concept.lessonId ? <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{progress.status === 'not_started' ? '开始' : '继续'}</span>
      : <span className="text-[10px] text-zinc-400">课程编写中</span>}
    <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-indigo-500" />
  </button>
}

function HomeView({ getProgress, suggestedId, onOpenConcept, setView }: {
  getProgress: (id: string) => ConceptLearningProgress; suggestedId?: string; onOpenConcept: (concept: LearningConcept) => void; setView: (view: LearningView) => void
}) {
  const suggested = LEARNING_CONCEPTS.find((item) => item.id === suggestedId)
  const firstStage = LEARNING_CONCEPTS.filter((item) => item.level === 'pre_a1')
  const completed = LEARNING_CONCEPTS.filter((item) => getProgress(item.id).status === 'completed').length
  return <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-9">
    <div className="border-b border-stone-200 pb-7 dark:border-zinc-800">
      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">完整英语课程 · Pre-A1—C1</p>
      <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-3xl">从理解结构，到独立表达</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">固定课程负责准确讲解；AI 每次生成新的识别、理解、构建与运用任务，并针对你的答案继续解释。</p>
        </div>
        <button type="button" onClick={() => setView('routes')} className="flex shrink-0 items-center gap-2 text-xs font-bold text-zinc-600 hover:text-indigo-700 dark:text-zinc-300 dark:hover:text-indigo-300"><Route className="h-4 w-4" />打开课程目录</button>
      </div>
    </div>

    {suggested ? <section className="py-7">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">继续学习</h3>
        <span className="text-xs text-zinc-400">当前浏览器已完成 {completed} / {LEARNING_CONCEPTS.length}</span>
      </div>
      <button type="button" onClick={() => onOpenConcept(suggested)} className="mt-4 flex w-full flex-col gap-5 rounded-2xl bg-indigo-700 p-5 text-left text-white shadow-lg shadow-indigo-900/10 transition hover:bg-indigo-600 sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/12"><GraduationCap className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">{LEARNING_LEVELS.find((level) => level.id === suggested.level)?.label} · {LEARNING_DOMAINS.find((domain) => domain.id === suggested.domain)?.title}</p>
          <p className="mt-1 text-xl font-black">{suggested.title}</p>
          <p className="mt-1 text-sm leading-5 text-indigo-100">{suggested.canDo}</p>
        </div>
        <span className="flex items-center gap-2 text-xs font-bold">{getProgress(suggested.id).status === 'not_started' ? '开始本课' : getProgress(suggested.id).status === 'completed' ? '复习本课' : '继续本课'}<ArrowRight className="h-4 w-4" /></span>
      </button>
    </section> : <section className="py-7"><div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30"><CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" /><div><h3 className="text-sm font-black text-emerald-950 dark:text-emerald-100">全部课程已完成</h3><p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-300">当前没有到期复习。后续复习会按掌握结果出现在“复习”中。</p></div></div></section>}

    <section className="border-t border-stone-200 pt-7 dark:border-zinc-800">
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold text-zinc-400">起步阶段</p><h3 className="mt-1 text-lg font-black text-zinc-950 dark:text-white">Pre-A1 · 从词到最小表达</h3></div><button type="button" onClick={() => setView('routes')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400">查看课程目录</button></div>
      <div className="mt-4">{firstStage.map((concept) => <ConceptRow key={concept.id} concept={concept} progress={getProgress(concept.id)} onOpen={() => onOpenConcept(concept)} />)}</div>
    </section>
  </div>
}

function RoutesView({ selectedRouteId, setSelectedRouteId, getProgress, onOpenConcept }: {
  selectedRouteId: string; setSelectedRouteId: (id: string) => void; getProgress: (id: string) => ConceptLearningProgress; onOpenConcept: (concept: LearningConcept) => void
}) {
  const route = LEARNING_ROUTES.find((item) => item.id === selectedRouteId) ?? LEARNING_ROUTES[0]
  const routeConcepts = route.conceptIds.map((id) => LEARNING_CONCEPTS.find((item) => item.id === id)).filter(Boolean) as LearningConcept[]
  return <div className="flex h-full min-h-0 flex-col md:flex-row">
    <div className="shrink-0 border-b border-stone-200 p-4 dark:border-zinc-800 md:w-64 md:border-b-0 md:border-r md:p-6">
      <h2 className="text-lg font-black text-zinc-950 dark:text-white">课程目录</h2>
      <p className="mt-1 text-xs leading-5 text-zinc-500">选择完整主线或专项路线，目录已包含必要前置课程。</p>
      <div className="mt-4 flex gap-2 overflow-x-auto md:flex-col">
        {LEARNING_ROUTES.map((item) => <button key={item.id} type="button" onClick={() => setSelectedRouteId(item.id)} className={`shrink-0 rounded-lg px-3 py-2 text-left text-xs font-bold md:w-full ${route.id === item.id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}>{item.title}</button>)}
      </div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl"><p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{routeConcepts.length} 个知识节点（含必要前置）</p><h2 className="mt-1 text-2xl font-black text-zinc-950 dark:text-white">{route.title}</h2><p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{route.description}</p><div className="mt-4 border-l-2 border-indigo-500 pl-3"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">完成这条路线后</p><p className="mt-1 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{route.outcome}</p></div>
        <div className="mt-6">{LEARNING_LEVELS.map((level) => {
          const concepts = routeConcepts.filter((item) => item.level === level.id)
          if (!concepts.length) return null
          return <section key={level.id} className="mb-7"><div className="sticky top-0 z-10 border-b border-zinc-300 bg-white/95 py-2 backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/95"><div className="flex items-baseline gap-2"><span className="text-sm font-black text-zinc-950 dark:text-white">{level.label}</span><span className="text-xs text-zinc-500">{level.title}</span></div><p className="mt-1 text-[11px] leading-4 text-zinc-400">{level.outcome}</p></div>{concepts.map((concept) => <ConceptRow key={concept.id} concept={concept} progress={getProgress(concept.id)} onOpen={() => onOpenConcept(concept)} />)}</section>
        })}</div>
        <details className="mt-10 border-t border-zinc-200 py-5 text-xs dark:border-zinc-800"><summary className="cursor-pointer font-black text-zinc-600 dark:text-zinc-300">课程范围依据</summary><p className="mt-3 leading-5 text-zinc-500">这些资料用于校准阶段能力与知识范围；具体讲解由项目课程数据固定提供，AI 练习不能修改课程规则。</p><div className="mt-3 flex flex-col gap-2">{CURRICULUM_REFERENCES.map((reference) => <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer" className="w-fit text-indigo-600 hover:underline dark:text-indigo-400">{reference.title} · {reference.use}</a>)}</div></details>
      </div>
    </div>
  </div>
}

function ReviewView({ dueReviews, getProgress, onOpenConcept }: { dueReviews: ConceptLearningProgress[]; getProgress: (id: string) => ConceptLearningProgress; onOpenConcept: (concept: LearningConcept) => void }) {
  const scheduled = LEARNING_CONCEPTS.map((concept) => ({ concept, progress: getProgress(concept.id) })).filter((item) => item.progress.nextReviewAt).sort((a, b) => (a.progress.nextReviewAt ?? '').localeCompare(b.progress.nextReviewAt ?? ''))
  return <div className="mx-auto h-full w-full max-w-3xl overflow-y-auto px-4 py-7 sm:px-8"><h2 className="text-2xl font-black text-zinc-950 dark:text-white">智能复习</h2><p className="mt-2 text-sm text-zinc-500">到期后重新生成不同语境，检查能否迁移运用；不读取填词或对话数据。</p>
    <div className="mt-7 border-y border-stone-200 py-5 dark:border-zinc-800"><p className="text-xs font-bold text-zinc-400">现在需要复习</p><p className="mt-1 text-3xl font-black text-zinc-950 dark:text-white">{dueReviews.length}</p></div>
    <div className="mt-5">{dueReviews.length ? dueReviews.map((progress) => { const concept = LEARNING_CONCEPTS.find((item) => item.id === progress.conceptId); return concept ? <ConceptRow key={concept.id} concept={concept} progress={progress} onOpen={() => onOpenConcept(concept)} /> : null }) : <div className="py-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">今天没有到期内容</p><p className="mt-1 text-xs text-zinc-500">完成 AI 引导练习后，系统会根据四项结果安排下一次新题复习。</p></div>}</div>
    {scheduled.length > 0 && <section className="mt-7"><h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">后续安排</h3>{scheduled.slice(0, 8).map(({ concept, progress }) => <div key={concept.id} className="flex items-center gap-3 border-b border-stone-200 py-3 text-xs dark:border-zinc-800"><span className="min-w-0 flex-1 font-semibold text-zinc-700 dark:text-zinc-300">{concept.title}</span><time className="text-zinc-400">{new Date(progress.nextReviewAt ?? '').toLocaleDateString('zh-CN')}</time></div>)}</section>}
  </div>
}

function ActivityPlayer({ activity, conceptId, lesson, modelId, onComplete, onAskTutor }: {
  activity: LearningActivity
  conceptId: string
  lesson: LearningLesson
  modelId: string
  onComplete: (score: number) => void
  onAskTutor: (context: AskContext, question: string) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [ordered, setOrdered] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<LearningEvaluationResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  useEffect(() => () => controllerRef.current?.abort(), [])

  const answerText = activity.type === 'choice'
    ? (selected === null ? '' : activity.options[selected])
    : activity.type === 'order' ? ordered.join(' ') : inputValue.trim()
  const submit = async () => {
    setError(null)
    if (activity.type === 'apply') {
      const controller = new AbortController()
      controllerRef.current?.abort()
      controllerRef.current = controller
      setIsChecking(true)
      try {
        const evaluation = await evaluateLearningAnswer({ conceptId, activity, answer: inputValue.trim(), model: modelId || undefined }, controller.signal)
        setResult(evaluation)
        onComplete(evaluation.score)
      } catch {
        if (!controller.signal.aborted) setError('AI 暂时无法完成评价，请保留答案后重试。')
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null
        setIsChecking(false)
      }
      return
    }
    let correct = false
    let correction = ''
    if (activity.type === 'choice') { correct = selected === activity.answer; correction = activity.options[activity.answer] }
    if (activity.type === 'order') { correct = ordered.join(' ') === activity.answer.join(' '); correction = activity.answer.join(' ') }
    if (activity.type === 'input') {
      const normalize = (value: string) => value.toLocaleLowerCase().trim().replace(/[’]/g, "'").replace(/[.!?,;:]+$/g, '')
      correct = activity.answers.some((answer) => normalize(answer) === normalize(inputValue))
      correction = activity.answers[0]
    }
    const evaluation = { score: correct ? 100 : 0, correct, feedback: activity.explanation, correction, nextStep: correct ? '继续到下一项，把同一规则迁移到新的语境。' : '先对照课程规则解释错误原因，再用正确形式重说一次。' }
    setResult(evaluation)
    onComplete(evaluation.score)
  }
  const canSubmit = activity.type === 'choice' ? selected !== null : activity.type === 'order' ? ordered.length === activity.tokens.length : inputValue.trim().length > 0
  return <div><div className="flex items-center gap-2"><span className="rounded bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">{DIMENSIONS.find((item) => item.id === activity.dimension)?.label}</span><p className="text-sm font-bold text-zinc-950 dark:text-white">{activity.prompt}</p></div>
    <div className="mt-5">
      {activity.type === 'choice' && <div className="space-y-2">{activity.options.map((option, index) => <button key={option} type="button" disabled={result !== null} onClick={() => setSelected(index)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm ${selected === index ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100' : 'border-zinc-200 dark:border-zinc-700'}`}><span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-[10px] font-bold">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>}
      {activity.type === 'order' && <><div className="min-h-14 rounded-xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700">{ordered.length ? ordered.map((token, index) => <button key={`${token}-${index}`} type="button" disabled={result !== null} onClick={() => setOrdered((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="mr-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white">{token}</button>) : <span className="text-xs text-zinc-400">依次点击词块</span>}</div><div className="mt-3 flex flex-wrap gap-2">{activity.tokens.map((token, index) => { const used = ordered.filter((item) => item === token).length >= activity.tokens.slice(0, index + 1).filter((item) => item === token).length; return <button key={`${token}-${index}`} type="button" disabled={used || result !== null} onClick={() => setOrdered((current) => [...current, token])} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold disabled:opacity-30 dark:border-zinc-700">{token}</button> })}</div></>}
      {activity.type === 'input' && <div><input value={inputValue} disabled={result !== null} onChange={(event) => setInputValue(event.target.value)} placeholder={activity.hint} className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" /></div>}
      {activity.type === 'apply' && <div><textarea value={inputValue} disabled={result !== null || isChecking} onChange={(event) => setInputValue(event.target.value)} placeholder="写下你自己的表达，AI 会依据本课规则评价" className="min-h-28 w-full resize-y rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" /><p className="mt-4 text-xs font-bold text-zinc-700 dark:text-zinc-300">AI 将检查</p><ul className="mt-2 space-y-2">{activity.checklist.map((item) => <li key={item} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />{item}</li>)}</ul></div>}
    </div>
    {result === null ? <><button type="button" disabled={!canSubmit || isChecking} onClick={() => { void submit() }} className="mt-5 flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-30 dark:bg-white dark:text-zinc-900">{isChecking && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}{activity.type === 'apply' ? isChecking ? 'AI 正在评价' : '交给 AI 评价' : '检查答案'}</button>{error && <p role="alert" className="mt-3 text-xs text-amber-700 dark:text-amber-300">{error}</p>}</>
      : <div className={`mt-5 border-l-2 p-4 ${result.correct ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20' : 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/20'}`}><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-black">{result.correct ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-amber-600" />}{result.correct ? '已达到本项要求' : '这部分还需要理解'}</p><span className="text-xs font-black text-zinc-500">{result.score}</span></div><p className="mt-2 text-xs leading-5 text-zinc-700 dark:text-zinc-300">{result.feedback}</p>{result.correction && <p className="mt-2 text-xs text-zinc-500"><strong>可参考：</strong>{result.correction}</p>}<p className="mt-2 text-xs text-zinc-500"><strong>下一步：</strong>{result.nextStep}</p><button type="button" onClick={() => onAskTutor({ lessonId: lesson.id, lessonTitle: lesson.title, activityPrompt: activity.prompt, learnerAnswer: answerText, feedback: result.feedback }, '请结合本课规则、这道题和我的答案，具体解释我为什么对或错。再给一个不同语境的例子让我模仿。')} className="mt-4 flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"><HelpCircle className="h-3.5 w-3.5" />让 AI 解释这道题</button></div>}
  </div>
}

function LessonPlayer({ lesson, speech, modelId, onAskTutor, onClose, onFinish }: {
  lesson: LearningLesson
  speech: SpeechPlayer
  modelId: string
  onAskTutor: (context: AskContext, question: string) => void
  onClose: () => void
  onFinish: (scores: Record<MasteryDimension, number>) => void
}) {
  const [phase, setPhase] = useState<'learn' | 'practice' | 'result'>('learn')
  const [activityIndex, setActivityIndex] = useState(0)
  const [activities, setActivities] = useState<LearningActivity[]>([])
  const [results, setResults] = useState<Record<string, number>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const generationControllerRef = useRef<AbortController | null>(null)
  const activity = activities[activityIndex]
  const lessonConcept = LEARNING_CONCEPTS.find((concept) => concept.id === lesson.conceptId)
  const prerequisiteTitles = lessonConcept?.prerequisites.map((id) => LEARNING_CONCEPTS.find((concept) => concept.id === id)?.title).filter(Boolean) ?? []
  const scores = useMemo(() => Object.fromEntries(DIMENSIONS.map(({ id }) => {
    const items = activities.filter((item) => item.dimension === id)
    const total = items.reduce((sum, item) => sum + (results[item.id] ?? 0), 0)
    return [id, items.length ? Math.round(total / items.length) : 0]
  })) as Record<MasteryDimension, number>, [activities, results])
  const scoreAverage = (scores.recognition + scores.understanding + scores.construction + scores.application) / 4
  const lessonMastered = scoreAverage >= 70 && Math.min(scores.recognition, scores.understanding, scores.construction, scores.application) >= 50
  const finish = () => { onFinish(scores); setPhase('result') }
  const preparePractice = async (enterWhenReady: boolean) => {
    generationControllerRef.current?.abort()
    const controller = new AbortController()
    generationControllerRef.current = controller
    setIsGenerating(true)
    setGenerationError(null)
    try {
      const recentPrompts = loadPracticeHistory(lesson.conceptId)
      const response = await generateLearningPractice({
        conceptId: lesson.conceptId,
        recentPrompts,
        diversitySeed: incrementStoredCounter(PRACTICE_VARIETY_KEY),
        model: modelId || undefined,
      }, controller.signal)
      if (response.activities.length !== DIMENSIONS.length) throw new Error('INCOMPLETE_PRACTICE')
      savePracticeHistory(lesson.conceptId, response.activities.map((item) => item.prompt))
      setActivities(response.activities)
      setResults({})
      setActivityIndex(0)
      if (enterWhenReady) setPhase('practice')
    } catch {
      if (!controller.signal.aborted) setGenerationError('AI 暂时没有生成出经过结构校验的新练习，请重试。课程讲解仍可正常阅读。')
    } finally {
      if (generationControllerRef.current === controller) generationControllerRef.current = null
      setIsGenerating(false)
    }
  }
  useEffect(() => {
    void preparePractice(false)
    return () => generationControllerRef.current?.abort()
  }, [lesson.id, modelId])
  return <div className="flex h-full min-h-0 flex-col bg-white dark:bg-zinc-950">
    <header className="flex shrink-0 items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-6"><button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="返回课程"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-zinc-950 dark:text-white">{lesson.title}</p><p className="text-[10px] text-zinc-400">{phase === 'learn' ? '学习内容' : phase === 'practice' ? `AI 引导练习 ${activityIndex + 1} / ${activities.length}` : '本课结果'}</p></div><span className="flex items-center gap-1 text-[10px] text-zinc-400"><Clock3 className="h-3.5 w-3.5" />约 {lesson.estimatedMinutes} 分钟</span></header>
    <div className="min-h-0 flex-1 overflow-y-auto">
      {phase === 'learn' && <article className="mx-auto max-w-3xl px-4 py-7 sm:px-8 sm:py-10"><p className="text-xs font-black text-indigo-600 dark:text-indigo-400">本课目标</p><h2 className="mt-2 text-2xl font-black leading-tight text-zinc-950 dark:text-white">{lesson.objective}</h2>{prerequisiteTitles.length > 0 && <p className="mt-3 text-[11px] text-zinc-400">前置知识：{prerequisiteTitles.join(' · ')}</p>}
        {lessonConcept && <details className="mt-5 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"><summary className="cursor-pointer text-xs font-black text-zinc-700 dark:text-zinc-300">查看掌握标准</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{DIMENSIONS.map((item) => <div key={item.id}><p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{item.label}</p><p className="mt-1 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">{lessonConcept.mastery[item.id]}</p></div>)}</div></details>}
        <section className="mt-8 border-l-2 border-indigo-500 pl-4"><h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100">场景</h3><p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{lesson.situation}</p></section>
        <section className="mt-8"><h3 className="text-sm font-black text-zinc-950 dark:text-white">观察与逐句拆解</h3><div className="mt-3 divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">{lesson.examples.map((example, index) => { const speechId = `${lesson.id}-example-${index}`; return <div key={example.english} className="py-5"><div className="flex items-start gap-3"><p className="min-w-0 flex-1 text-base font-black text-zinc-950 dark:text-white">{example.english}</p><button type="button" onClick={() => speech.toggle(speechId, example.english, '课程例句')} aria-label={`朗读：${example.english}`} className={`rounded-lg border p-2 transition ${speech.activeId === speechId ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'border-zinc-200 text-zinc-400 hover:text-indigo-600 dark:border-zinc-700'}`}><Volume2 className="h-4 w-4" /></button></div><p className="mt-1 text-xs text-zinc-500">{example.chinese}</p><dl className="mt-3 space-y-1.5">{example.parts.map((part) => { const [form, ...meaning] = part.split('='); return <div key={part} className="grid grid-cols-[minmax(5rem,auto)_1fr] gap-3 text-[11px] leading-5"><dt className="font-black text-zinc-700 dark:text-zinc-300">{form.trim()}</dt><dd className="text-zinc-500">{meaning.join('=').trim() || '在句中共同完成这一表达作用'}</dd></div> })}</dl></div> })}</div><p className="mt-4 border-l-2 border-amber-400 bg-amber-50/70 p-4 text-xs font-semibold leading-5 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">需要你发现：{lesson.observation}</p></section>
        <section className="mt-9"><h3 className="text-sm font-black text-zinc-950 dark:text-white">为什么这样表达</h3><div className="mt-3 space-y-5">{lesson.explanation.map((item) => <div key={item.title}><p className="text-xs font-black text-zinc-800 dark:text-zinc-200">{item.title}</p><p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{item.body}</p></div>)}</div><button type="button" onClick={() => onAskTutor({ lessonId: lesson.id, lessonTitle: lesson.title }, '我没有理解本课。请只围绕本课目标和例句，换一种更简单的方式分步骤解释，并补充一个新的生活化例子。')} className="mt-5 flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"><HelpCircle className="h-3.5 w-3.5" />让 AI 重新讲解这部分</button></section>
        <section className="mt-9 grid gap-7 sm:grid-cols-2"><div><h3 className="text-sm font-black text-zinc-950 dark:text-white">使用规则</h3><ol className="mt-3 space-y-2">{lesson.rules.map((rule, index) => <li key={rule} className="flex gap-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400"><span className="font-mono font-bold text-indigo-500">{index + 1}</span>{rule}</li>)}</ol></div><div><h3 className="text-sm font-black text-zinc-950 dark:text-white">易错对比</h3><div className="mt-3 space-y-3">{lesson.contrasts.map((item) => <div key={item.wrong} className="text-xs"><p className="text-red-600 line-through dark:text-red-400">{item.wrong}</p><p className="mt-1 font-bold text-emerald-700 dark:text-emerald-400">{item.right}</p><p className="mt-1 leading-5 text-zinc-500">{item.reason}</p></div>)}</div></div></section>
        <details className="mt-9 border-y border-zinc-200 py-4 text-xs dark:border-zinc-800"><summary className="flex cursor-pointer items-center gap-2 font-black text-zinc-700 dark:text-zinc-300"><ShieldCheck className="h-4 w-4 text-emerald-600" />本课如何控制准确性</summary><p className="mt-3 leading-5 text-zinc-500">课程目标、规则、例句和易错点由项目固定提供，并校验课程前置关系与内容结构；AI 只能围绕这些内容生成新情境和反馈，不能修改知识规则。外部框架用于校准能力范围，不等于对每句话的逐条背书。</p><div className="mt-3 flex flex-col gap-2">{CURRICULUM_REFERENCES.map((reference) => <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer" className="w-fit text-indigo-600 hover:underline dark:text-indigo-400">{reference.title}</a>)}</div></details>
        {generationError && <p role="alert" className="mt-6 border-l-2 border-amber-500 bg-amber-50/70 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">{generationError}</p>}
        <div className="mt-8 flex flex-col items-end gap-2"><button type="button" disabled={isGenerating} onClick={() => { if (activities.length === DIMENSIONS.length) setPhase('practice'); else void preparePractice(true) }} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white hover:bg-indigo-500 disabled:opacity-60">{isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{isGenerating ? 'AI 正在后台准备练习' : activities.length === DIMENSIONS.length ? '开始 AI 引导练习' : '重新准备 AI 练习'}</button><p className="text-[10px] text-zinc-400">打开课程后即开始准备；你可以先阅读，准备完成后直接进入</p></div>
      </article>}
      {phase === 'practice' && activity && <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-12"><div className="mb-3 flex items-center gap-2 text-[11px] text-zinc-500"><Sparkles className="h-3.5 w-3.5 text-indigo-500" />本组题目根据本课内容即时生成，不会照搬上次题目</div><div className="mb-7 flex gap-1">{activities.map((item, index) => <span key={item.id} className={`h-1 flex-1 rounded-full ${index <= activityIndex ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-800'}`} />)}</div><ActivityPlayer key={activity.id} activity={activity} conceptId={lesson.conceptId} lesson={lesson} modelId={modelId} onAskTutor={onAskTutor} onComplete={(score) => setResults((current) => ({ ...current, [activity.id]: score }))} />{results[activity.id] !== undefined && <div className="mt-6 flex justify-end">{activityIndex < activities.length - 1 ? <button type="button" onClick={() => setActivityIndex((index) => index + 1)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white">下一题<ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={finish} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white">完成本课</button>}</div>}</div>}
      {phase === 'result' && <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:px-8"><div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${lessonMastered ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-amber-50 dark:bg-amber-950/50'}`}>{lessonMastered ? <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> : <RotateCcw className="h-6 w-6 text-amber-600 dark:text-amber-400" />}</div><h2 className="mt-4 text-2xl font-black text-zinc-950 dark:text-white">{lessonMastered ? '本课已达到掌握标准' : '本课仍需巩固'}</h2><p className="mt-2 text-xs leading-5 text-zinc-500">{lessonMastered ? '四项能力均达到最低要求，系统已安排后续复习。' : '至少一项能力尚未达到要求，系统将在较近日期安排复习。'}</p><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{DIMENSIONS.map((item) => <div key={item.id} className="border-t border-zinc-200 pt-3 dark:border-zinc-800"><p className="text-xs text-zinc-500">{item.label}</p><p className="mt-1 text-xl font-black text-zinc-950 dark:text-white">{scores[item.id]}</p></div>)}</div><div className="mt-8 text-left"><h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">本课总结</h3><ul className="mt-3 space-y-2">{lesson.summary.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />{item}</li>)}</ul><p className="mt-5 rounded-xl bg-stone-100 p-4 text-xs leading-5 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"><strong>复习时尝试：</strong>{lesson.reviewPrompt}</p></div><button type="button" onClick={onClose} className="mt-7 rounded-lg bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">返回课程</button></div>}
    </div>
  </div>
}

export default function SystemLearning({ speech, modelId, onAskTutor }: {
  speech: SpeechPlayer
  modelId: string
  onAskTutor: (context: AskContext, question: string) => void
}) {
  const learning = useSystemLearning()
  const [view, setView] = useState<LearningView>('home')
  const [activeLesson, setActiveLesson] = useState<LearningLesson | null>(null)
  const [outlineConcept, setOutlineConcept] = useState<LearningConcept | null>(null)
  const [loadingConceptId, setLoadingConceptId] = useState<string | null>(null)
  const [courseLoadError, setCourseLoadError] = useState(false)
  const openConcept = (concept: LearningConcept) => {
    if (!concept.lessonId) { setOutlineConcept(concept); return }
    setCourseLoadError(false)
    setLoadingConceptId(concept.id)
    void import('../data/learningLessons')
      .then(({ LESSON_BY_ID }) => {
        const lesson = LESSON_BY_ID.get(concept.lessonId ?? '')
        if (!lesson) throw new Error(`Missing lesson: ${concept.lessonId}`)
        learning.startConcept(concept.id)
        setActiveLesson(lesson)
      })
      .catch(() => setCourseLoadError(true))
      .finally(() => setLoadingConceptId(null))
  }
  if (activeLesson) return <LessonPlayer lesson={activeLesson} speech={speech} modelId={modelId} onAskTutor={onAskTutor} onClose={() => setActiveLesson(null)} onFinish={(scores) => learning.completeLesson(activeLesson.conceptId, scores)} />
  return <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:flex-row">
    <LearningSidebar view={view} setView={setView} dueCount={learning.dueReviews.length} />
    <div className="min-h-0 flex-1 overflow-hidden">
      {view === 'home' && <div className="h-full overflow-y-auto"><HomeView getProgress={learning.getProgress} suggestedId={learning.suggestedConceptId} onOpenConcept={openConcept} setView={setView} /></div>}
      {view === 'routes' && <RoutesView selectedRouteId={learning.selectedRouteId} setSelectedRouteId={learning.setSelectedRouteId} getProgress={learning.getProgress} onOpenConcept={openConcept} />}
      {view === 'review' && <ReviewView dueReviews={learning.dueReviews} getProgress={learning.getProgress} onOpenConcept={openConcept} />}
    </div>
    {loadingConceptId && <div role="status" aria-live="polite" className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-zinc-950/70"><span className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold text-zinc-700 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">正在打开课程…</span></div>}
    {courseLoadError && <div role="alert" className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-lg dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"><span>课程内容加载失败，请检查网络后重试。</span><button type="button" onClick={() => setCourseLoadError(false)} className="font-black">关闭</button></div>}
    {outlineConcept && <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6" onClick={() => setOutlineConcept(null)}><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900 sm:rounded-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{LEARNING_LEVELS.find((item) => item.id === outlineConcept.level)?.label} · {LEARNING_DOMAINS.find((item) => item.id === outlineConcept.domain)?.title}</p><h3 className="mt-1 text-xl font-black text-zinc-950 dark:text-white">{outlineConcept.title}</h3></div><button type="button" onClick={() => setOutlineConcept(null)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button></div><p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{outlineConcept.summary}</p><div className="mt-5 border-y border-zinc-200 py-4 dark:border-zinc-700"><p className="text-xs font-black text-zinc-800 dark:text-zinc-200">学完能够</p><p className="mt-1 text-xs leading-5 text-zinc-500">{outlineConcept.canDo}</p></div><div className="mt-4"><p className="text-xs font-black text-zinc-800 dark:text-zinc-200">内容范围</p><div className="mt-2 flex flex-wrap gap-2">{outlineConcept.topics.map((topic) => <span key={topic} className="rounded-md bg-stone-100 px-2 py-1 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{topic}</span>)}</div></div><p className="mt-5 text-[11px] text-zinc-400">知识范围与掌握标准已经确定，详细课程内容正在按前置顺序编写。</p></div></div>}
  </div>
}
