// src/components/SystemLearning.tsx
// 版式：一本编过页码的语法书。课程行以「§ + 序号」编码，课文例句用斜体衬线，
// 完成度以墨绿实章标记——整屏像翻开的书页，而不是仪表盘。
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Circle, Clock3,
  GraduationCap, HelpCircle, LoaderCircle, RotateCcw, Route, ShieldCheck, Sparkles, Volume2, X,
} from './Icon'
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

function conceptIndex(concept: LearningConcept): number {
  return LEARNING_CONCEPTS.findIndex((item) => item.id === concept.id) + 1
}

function conceptCode(concept: LearningConcept): string {
  return `§${conceptIndex(concept)}`
}

function StatusMark({ progress }: { progress: ConceptLearningProgress }) {
  if (progress.status === 'completed') return <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-forest text-paper dark:bg-forest-dark dark:text-paper-dark"><Check className="h-3 w-3" /></span>
  if (progress.status === 'learning') return <Circle className="h-4.5 w-4.5 fill-gilt/40 text-gilt dark:fill-gilt-dark/40 dark:text-gilt-dark" />
  return <Circle className="h-4.5 w-4.5 text-ink/20 dark:text-ink-dark/25" />
}

function LearningSidebar({ view, setView, dueCount }: { view: LearningView; setView: (view: LearningView) => void; dueCount: number }) {
  const items: Array<{ id: LearningView; label: string; code: string }> = [
    { id: 'home', label: '我的学习', code: 'Ⅰ' },
    { id: 'routes', label: '课程目录', code: 'Ⅱ' },
    { id: 'review', label: '智能复习', code: 'Ⅲ' },
  ]
  return (
    <aside className="shrink-0 border-b border-ink/15 dark:border-ink-dark/20 lg:w-52 lg:border-b-0 lg:border-r">
      <div className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:p-4">
        <p className="margin-code hidden px-2 pb-2 lg:block">壹 · 课程</p>
        {items.map((item) => {
          const active = view === item.id
          return <button key={item.id} type="button" onClick={() => setView(item.id)}
            className={`flex h-10 shrink-0 items-center gap-2.5 rounded-md px-3 text-xs font-semibold transition lg:w-full ${active ? 'bg-leaf text-ink shadow-sm dark:bg-leaf-dark dark:text-ink-dark' : 'text-ink/55 hover:bg-leaf/60 dark:text-ink-dark/55 dark:hover:bg-leaf-dark/60'}`}>
            <span className={`margin-code ${active ? '!text-scarlet dark:!text-scarlet-dark' : ''}`}>{item.code}</span>
            <span>{item.label}</span>
            {item.id === 'review' && dueCount > 0 && <span className="ml-auto rounded-full border border-gilt/50 px-1.5 py-0.5 text-[10px] font-bold text-gilt dark:border-gilt-dark/50 dark:text-gilt-dark">{dueCount}</span>}
          </button>
        })}
      </div>
    </aside>
  )
}

function ConceptRow({ concept, progress, onOpen }: { concept: LearningConcept; progress: ConceptLearningProgress; onOpen: () => void }) {
  const domain = LEARNING_DOMAINS.find((item) => item.id === concept.domain)
  return <button type="button" onClick={onOpen} className="group flex w-full items-center gap-3 border-b border-ink/10 px-1 py-3 text-left last:border-b-0 dark:border-ink-dark/15">
    <StatusMark progress={progress} />
    <span className="margin-code w-8 shrink-0">{conceptCode(concept)}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-ink group-hover:text-forest dark:text-ink-dark dark:group-hover:text-forest-dark">{concept.title}</span>
      <span className="mt-0.5 block text-xs leading-5 text-ink/50 dark:text-ink-dark/50">{domain?.shortTitle} · {concept.canDo}</span>
    </span>
    {concept.lessonId ? <span className="text-[11px] font-semibold text-forest dark:text-forest-dark">{progress.status === 'not_started' ? '开始' : '继续'}</span>
      : <span className="text-[10px] text-ink/40 dark:text-ink-dark/40">课程编写中</span>}
    <ArrowRight className="h-4 w-4 text-ink/25 group-hover:text-forest dark:text-ink-dark/30 dark:group-hover:text-forest-dark" />
  </button>
}

function HomeView({ getProgress, suggestedId, onOpenConcept, setView }: {
  getProgress: (id: string) => ConceptLearningProgress; suggestedId?: string; onOpenConcept: (concept: LearningConcept) => void; setView: (view: LearningView) => void
}) {
  const suggested = LEARNING_CONCEPTS.find((item) => item.id === suggestedId)
  const firstStage = LEARNING_CONCEPTS.filter((item) => item.level === 'pre_a1')
  const completed = LEARNING_CONCEPTS.filter((item) => getProgress(item.id).status === 'completed').length
  return <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-9">
    <div className="border-b border-ink/15 pb-7 dark:border-ink-dark/20">
      <p className="margin-code">完整英语课程 · Pre-A1 — C1</p>
      <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink dark:text-ink-dark sm:text-3xl">从理解结构，到独立表达</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65 dark:text-ink-dark/65">固定课程负责准确讲解；AI 每次生成新的识别、理解、构建与运用任务，并针对你的答案继续解释。</p>
        </div>
        <button type="button" onClick={() => setView('routes')} className="flex shrink-0 items-center gap-2 text-xs font-bold text-ink/60 hover:text-forest dark:text-ink-dark/60 dark:hover:text-forest-dark"><Route className="h-4 w-4" />打开课程目录</button>
      </div>
    </div>

    {suggested ? <section className="py-7">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink dark:text-ink-dark">继续学习</h3>
        <span className="margin-code">已完成 {completed} / {LEARNING_CONCEPTS.length}</span>
      </div>
      <button type="button" onClick={() => onOpenConcept(suggested)} className="mt-4 flex w-full flex-col gap-5 rounded-lg border-2 border-forest bg-forest/5 p-5 text-left transition hover:bg-forest/10 dark:border-forest-dark dark:bg-forest-dark/10 dark:hover:bg-forest-dark/15 sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-forest text-paper dark:bg-forest-dark dark:text-paper-dark"><GraduationCap className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <p className="margin-code">{conceptCode(suggested)} · {LEARNING_LEVELS.find((level) => level.id === suggested.level)?.label} · {LEARNING_DOMAINS.find((domain) => domain.id === suggested.domain)?.title}</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink dark:text-ink-dark">{suggested.title}</p>
          <p className="mt-1 text-sm leading-5 text-ink/65 dark:text-ink-dark/65">{suggested.canDo}</p>
        </div>
        <span className="flex items-center gap-2 text-xs font-bold text-forest dark:text-forest-dark">{getProgress(suggested.id).status === 'not_started' ? '开始本课' : getProgress(suggested.id).status === 'completed' ? '复习本课' : '继续本课'}<ArrowRight className="h-4 w-4" /></span>
      </button>
    </section> : <section className="py-7"><div className="flex items-start gap-4 rounded-lg border border-forest/40 bg-forest/5 p-5 dark:border-forest-dark/50 dark:bg-forest-dark/10"><CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-forest dark:text-forest-dark" /><div><h3 className="text-sm font-bold text-ink dark:text-ink-dark">全部课程已完成</h3><p className="mt-1 text-xs leading-5 text-ink/65 dark:text-ink-dark/65">当前没有到期复习。后续复习会按掌握结果出现在“复习”中。</p></div></div></section>}

    <section className="border-t border-ink/15 pt-7 dark:border-ink-dark/20">
      <div className="flex items-end justify-between gap-4"><div><p className="margin-code">起步阶段</p><h3 className="mt-1 font-display text-lg font-semibold text-ink dark:text-ink-dark">Pre-A1 · 从词到最小表达</h3></div><button type="button" onClick={() => setView('routes')} className="text-xs font-bold text-forest dark:text-forest-dark">查看课程目录</button></div>
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
    <div className="shrink-0 border-b border-ink/15 p-4 dark:border-ink-dark/20 md:w-64 md:border-b-0 md:border-r md:p-6">
      <h2 className="font-display text-lg font-semibold text-ink dark:text-ink-dark">课程目录</h2>
      <p className="mt-1 text-xs leading-5 text-ink/55 dark:text-ink-dark/55">选择完整主线或专项路线，目录已包含必要前置课程。</p>
      <div className="mt-4 flex gap-2 overflow-x-auto md:flex-col">
        {LEARNING_ROUTES.map((item) => <button key={item.id} type="button" onClick={() => setSelectedRouteId(item.id)} className={`shrink-0 rounded-md px-3 py-2 text-left text-xs font-bold md:w-full ${route.id === item.id ? 'bg-forest/10 text-forest dark:bg-forest-dark/15 dark:text-forest-dark' : 'text-ink/60 hover:bg-ink/5 dark:text-ink-dark/60 dark:hover:bg-ink-dark/10'}`}>{item.title}</button>)}
      </div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl"><p className="margin-code">{routeConcepts.length} 个知识节点（含必要前置）</p><h2 className="mt-1 font-display text-2xl font-semibold text-ink dark:text-ink-dark">{route.title}</h2><p className="mt-2 text-sm leading-6 text-ink/65 dark:text-ink-dark/65">{route.description}</p><div className="mt-4 border-l-2 border-gilt pl-3 dark:border-gilt-dark"><p className="margin-code">完成这条路线后</p><p className="mt-1 text-sm leading-6 text-ink/75 dark:text-ink-dark/75">{route.outcome}</p></div>
        <div className="mt-6">{LEARNING_LEVELS.map((level) => {
          const concepts = routeConcepts.filter((item) => item.level === level.id)
          if (!concepts.length) return null
          return <section key={level.id} className="mb-7"><div className="sticky top-0 z-10 border-b border-ink/20 bg-leaf/95 py-2 backdrop-blur dark:border-ink-dark/25 dark:bg-leaf-dark/95"><div className="flex items-baseline gap-2"><span className="text-sm font-bold text-ink dark:text-ink-dark">{level.label}</span><span className="text-xs text-ink/55 dark:text-ink-dark/55">{level.title}</span></div><p className="margin-code mt-1">{level.outcome}</p></div>{concepts.map((concept) => <ConceptRow key={concept.id} concept={concept} progress={getProgress(concept.id)} onOpen={() => onOpenConcept(concept)} />)}</section>
        })}</div>
        <details className="mt-10 border-t border-ink/15 py-5 text-xs dark:border-ink-dark/20"><summary className="cursor-pointer font-bold text-ink/70 dark:text-ink-dark/70">课程范围依据</summary><p className="mt-3 leading-5 text-ink/55 dark:text-ink-dark/55">这些资料用于校准阶段能力与知识范围；具体讲解由项目课程数据固定提供，AI 练习不能修改课程规则。</p><div className="mt-3 flex flex-col gap-2">{CURRICULUM_REFERENCES.map((reference) => <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer" className="w-fit text-forest underline decoration-gilt underline-offset-4 hover:decoration-forest dark:text-forest-dark dark:hover:decoration-forest-dark">{reference.title} · {reference.use}</a>)}</div></details>
      </div>
    </div>
  </div>
}

function ReviewView({ dueReviews, getProgress, onOpenConcept }: { dueReviews: ConceptLearningProgress[]; getProgress: (id: string) => ConceptLearningProgress; onOpenConcept: (concept: LearningConcept) => void }) {
  const scheduled = LEARNING_CONCEPTS.map((concept) => ({ concept, progress: getProgress(concept.id) })).filter((item) => item.progress.nextReviewAt).sort((a, b) => (a.progress.nextReviewAt ?? '').localeCompare(b.progress.nextReviewAt ?? ''))
  return <div className="mx-auto h-full w-full max-w-3xl overflow-y-auto px-4 py-7 sm:px-8"><h2 className="font-display text-2xl font-semibold text-ink dark:text-ink-dark">智能复习</h2><p className="mt-2 text-sm text-ink/55 dark:text-ink-dark/55">到期后重新生成不同语境，检查能否迁移运用；不读取填词或对话数据。</p>
    <div className="mt-7 border-y border-ink/15 py-5 dark:border-ink-dark/20"><p className="margin-code">现在需要复习</p><p className="mt-1 font-display text-3xl font-semibold text-ink dark:text-ink-dark">{dueReviews.length}</p></div>
    <div className="mt-5">{dueReviews.length ? dueReviews.map((progress) => { const concept = LEARNING_CONCEPTS.find((item) => item.id === progress.conceptId); return concept ? <ConceptRow key={concept.id} concept={concept} progress={progress} onOpen={() => onOpenConcept(concept)} /> : null }) : <div className="py-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-forest dark:text-forest-dark" /><p className="mt-3 text-sm font-bold text-ink dark:text-ink-dark">今天没有到期内容</p><p className="mt-1 text-xs text-ink/55 dark:text-ink-dark/55">完成 AI 引导练习后，系统会根据四项结果安排下一次新题复习。</p></div>}</div>
    {scheduled.length > 0 && <section className="mt-7"><h3 className="text-sm font-bold text-ink dark:text-ink-dark">后续安排</h3>{scheduled.slice(0, 8).map(({ concept, progress }) => <div key={concept.id} className="flex items-center gap-3 border-b border-ink/10 py-3 text-xs dark:border-ink-dark/15"><span className="margin-code w-8 shrink-0">{conceptCode(concept)}</span><span className="min-w-0 flex-1 font-semibold text-ink/75 dark:text-ink-dark/75">{concept.title}</span><time className="text-ink/45 dark:text-ink-dark/45">{new Date(progress.nextReviewAt ?? '').toLocaleDateString('zh-CN')}</time></div>)}</section>}
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
  return <div><div className="flex items-center gap-2"><span className="margin-code !text-forest dark:!text-forest-dark">{DIMENSIONS.find((item) => item.id === activity.dimension)?.label}</span><p className="text-sm font-bold text-ink dark:text-ink-dark">{activity.prompt}</p></div>
    <div className="mt-5">
      {activity.type === 'choice' && <div className="space-y-2">{activity.options.map((option, index) => <button key={option} type="button" disabled={result !== null} onClick={() => setSelected(index)} className={`flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm ${selected === index ? 'border-forest bg-forest/5 text-ink dark:border-forest-dark dark:bg-forest-dark/10 dark:text-ink-dark' : 'border-ink/20 text-ink/80 hover:border-ink/45 dark:border-ink-dark/25 dark:text-ink-dark/80 dark:hover:border-ink-dark/55'}`}><span className="margin-code">{String.fromCharCode(65 + index)}</span><span className="font-display">{option}</span></button>)}</div>}
      {activity.type === 'order' && <><div className="min-h-14 rounded-md border border-dashed border-ink/30 p-3 dark:border-ink-dark/35">{ordered.length ? ordered.map((token, index) => <button key={`${token}-${index}`} type="button" disabled={result !== null} onClick={() => setOrdered((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="font-display mr-2 rounded-md bg-forest px-3 py-2 text-sm font-semibold text-paper dark:bg-forest-dark dark:text-paper-dark">{token}</button>) : <span className="text-xs text-ink/45 dark:text-ink-dark/45">依次点击词块</span>}</div><div className="mt-3 flex flex-wrap gap-2">{activity.tokens.map((token, index) => { const used = ordered.filter((item) => item === token).length >= activity.tokens.slice(0, index + 1).filter((item) => item === token).length; return <button key={`${token}-${index}`} type="button" disabled={used || result !== null} onClick={() => setOrdered((current) => [...current, token])} className="font-display rounded-md border border-ink/25 px-3 py-2 text-sm font-semibold text-ink disabled:opacity-30 dark:border-ink-dark/30 dark:text-ink-dark">{token}</button> })}</div></>}
      {activity.type === 'input' && <div><input value={inputValue} disabled={result !== null} onChange={(event) => setInputValue(event.target.value)} placeholder={activity.hint} className="target-lang h-11 w-full rounded-md border border-ink/25 bg-leaf px-3 text-sm text-ink placeholder:text-ink/35 focus:border-forest dark:border-ink-dark/30 dark:bg-leaf-dark dark:text-ink-dark dark:placeholder:text-ink-dark/35 dark:focus:border-forest-dark" /></div>}
      {activity.type === 'apply' && <div><textarea value={inputValue} disabled={result !== null || isChecking} onChange={(event) => setInputValue(event.target.value)} placeholder="写下你自己的表达，AI 会依据本课规则评价" className="target-lang min-h-28 w-full resize-y rounded-md border border-ink/25 bg-leaf p-3 text-sm text-ink placeholder:text-ink/35 focus:border-forest dark:border-ink-dark/30 dark:bg-leaf-dark dark:text-ink-dark dark:placeholder:text-ink-dark/35 dark:focus:border-forest-dark" /><p className="mt-4 text-xs font-bold text-ink/75 dark:text-ink-dark/75">AI 将检查</p><ul className="mt-2 space-y-2">{activity.checklist.map((item) => <li key={item} className="flex items-start gap-2 text-xs text-ink/65 dark:text-ink-dark/65"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest dark:text-forest-dark" />{item}</li>)}</ul></div>}
    </div>
    {result === null ? <><button type="button" disabled={!canSubmit || isChecking} onClick={() => { void submit() }} className="mt-5 flex items-center gap-2 rounded-md bg-forest px-4 py-2.5 text-xs font-bold text-paper disabled:opacity-30 dark:bg-forest-dark dark:text-paper-dark">{isChecking && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}{activity.type === 'apply' ? isChecking ? 'AI 正在评价' : '交给 AI 评价' : '检查答案'}</button>{error && <p role="alert" className="mt-3 text-xs text-scarlet dark:text-scarlet-dark">{error}</p>}</>
      : <div className={`mt-5 border-l-2 p-4 ${result.correct ? 'border-forest dark:border-forest-dark' : 'border-scarlet dark:border-scarlet-dark'}`}><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-bold text-ink dark:text-ink-dark">{result.correct ? <Check className="h-4 w-4 text-forest dark:text-forest-dark" /> : <X className="h-4 w-4 text-scarlet dark:text-scarlet-dark" />}{result.correct ? '已达到本项要求' : '这部分还需要理解'}</p><span className="margin-code">{result.score}</span></div><p className="mt-2 text-xs leading-5 text-ink/75 dark:text-ink-dark/75">{result.feedback}</p>{result.correction && <p className="mt-2 text-xs text-ink/55 dark:text-ink-dark/55"><strong>可参考：</strong><span className="target-lang">{result.correction}</span></p>}<p className="mt-2 text-xs text-ink/55 dark:text-ink-dark/55"><strong>下一步：</strong>{result.nextStep}</p><button type="button" onClick={() => onAskTutor({ lessonId: lesson.id, lessonTitle: lesson.title, activityPrompt: activity.prompt, learnerAnswer: answerText, feedback: result.feedback }, '请结合本课规则、这道题和我的答案，具体解释我为什么对或错。再给一个不同语境的例子让我模仿。')} className="mt-4 flex items-center gap-1.5 text-xs font-bold text-forest underline decoration-gilt underline-offset-4 hover:decoration-forest dark:text-forest-dark dark:hover:decoration-forest-dark"><HelpCircle className="h-3.5 w-3.5" />让 AI 解释这道题</button></div>}
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
  return <div className="flex h-full min-h-0 flex-col bg-leaf dark:bg-leaf-dark">
    <header className="flex shrink-0 items-center gap-3 border-b border-ink/15 px-4 py-3 dark:border-ink-dark/20 sm:px-6"><button type="button" onClick={onClose} className="rounded-md p-2 text-ink/55 hover:bg-ink/5 dark:text-ink-dark/55 dark:hover:bg-ink-dark/10" aria-label="返回课程"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink dark:text-ink-dark">{lessonConcept && <span className="margin-code mr-2">{conceptCode(lessonConcept)}</span>}{lesson.title}</p><p className="margin-code mt-0.5">{phase === 'learn' ? '学习内容' : phase === 'practice' ? `AI 引导练习 ${activityIndex + 1} / ${activities.length}` : '本课结果'}</p></div><span className="flex items-center gap-1 text-[10px] text-ink/45 dark:text-ink-dark/45"><Clock3 className="h-3.5 w-3.5" />约 {lesson.estimatedMinutes} 分钟</span></header>
    <div className="min-h-0 flex-1 overflow-y-auto">
      {phase === 'learn' && <article className="mx-auto max-w-3xl px-4 py-7 sm:px-8 sm:py-10"><p className="margin-code">本课目标</p><h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-ink dark:text-ink-dark">{lesson.objective}</h2>{prerequisiteTitles.length > 0 && <p className="mt-3 text-[11px] text-ink/45 dark:text-ink-dark/45">前置知识：{prerequisiteTitles.join(' · ')}</p>}
        {lessonConcept && <details className="mt-5 rounded-md border border-ink/15 px-4 py-3 dark:border-ink-dark/20"><summary className="cursor-pointer text-xs font-bold text-ink/75 dark:text-ink-dark/75">查看掌握标准</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{DIMENSIONS.map((item) => <div key={item.id}><p className="margin-code !text-forest dark:!text-forest-dark">{item.label}</p><p className="mt-1 text-[11px] leading-5 text-ink/60 dark:text-ink-dark/60">{lessonConcept.mastery[item.id]}</p></div>)}</div></details>}
        <section className="mt-8 border-l-2 border-gilt pl-4 dark:border-gilt-dark"><h3 className="margin-code">场景</h3><p className="mt-1 text-sm leading-6 text-ink/70 dark:text-ink-dark/70">{lesson.situation}</p></section>
        <section className="mt-8"><h3 className="text-sm font-bold text-ink dark:text-ink-dark">观察与逐句拆解</h3><div className="mt-3 divide-y divide-ink/10 border-y border-ink/10 dark:divide-ink-dark/15 dark:border-ink-dark/15">{lesson.examples.map((example, index) => { const speechId = `${lesson.id}-example-${index}`; return <div key={example.english} className="py-5"><div className="flex items-start gap-3"><p className="target-lang min-w-0 flex-1 text-lg text-ink dark:text-ink-dark">{example.english}</p><button type="button" onClick={() => speech.toggle(speechId, example.english, '课程例句')} aria-label={`朗读：${example.english}`} className={`rounded-md border p-2 transition ${speech.activeId === speechId ? 'border-forest bg-forest/10 text-forest dark:border-forest-dark dark:bg-forest-dark/15 dark:text-forest-dark' : 'border-ink/20 text-ink/45 hover:text-forest dark:border-ink-dark/25 dark:text-ink-dark/45 dark:hover:text-forest-dark'}`}><Volume2 className="h-4 w-4" /></button></div><p className="mt-1 text-xs text-ink/55 dark:text-ink-dark/55">{example.chinese}</p><dl className="mt-3 space-y-1.5">{example.parts.map((part) => { const [form, ...meaning] = part.split('='); return <div key={part} className="grid grid-cols-[minmax(5rem,auto)_1fr] gap-3 text-[11px] leading-5"><dt className="font-display font-semibold text-ink dark:text-ink-dark">{form.trim()}</dt><dd className="text-ink/60 dark:text-ink-dark/60">{meaning.join('=').trim() || '在句中共同完成这一表达作用'}</dd></div> })}</dl></div> })}</div><p className="mt-4 border-l-2 border-gilt bg-gilt/10 p-4 text-xs font-semibold leading-5 text-ink/80 dark:border-gilt-dark dark:bg-gilt-dark/10 dark:text-ink-dark/80">需要你发现：{lesson.observation}</p></section>
        <section className="mt-9"><h3 className="text-sm font-bold text-ink dark:text-ink-dark">为什么这样表达</h3><div className="mt-3 space-y-5">{lesson.explanation.map((item) => <div key={item.title}><p className="text-xs font-bold text-ink/85 dark:text-ink-dark/85">{item.title}</p><p className="mt-1 text-sm leading-6 text-ink/70 dark:text-ink-dark/70">{item.body}</p></div>)}</div><button type="button" onClick={() => onAskTutor({ lessonId: lesson.id, lessonTitle: lesson.title }, '我没有理解本课。请只围绕本课目标和例句，换一种更简单的方式分步骤解释，并补充一个新的生活化例子。')} className="mt-5 flex items-center gap-1.5 text-xs font-bold text-forest underline decoration-gilt underline-offset-4 hover:decoration-forest dark:text-forest-dark dark:hover:decoration-forest-dark"><HelpCircle className="h-3.5 w-3.5" />让 AI 重新讲解这部分</button></section>
        <section className="mt-9 grid gap-7 sm:grid-cols-2"><div><h3 className="text-sm font-bold text-ink dark:text-ink-dark">使用规则</h3><ol className="mt-3 space-y-2">{lesson.rules.map((rule, index) => <li key={rule} className="flex gap-2.5 text-xs leading-5 text-ink/70 dark:text-ink-dark/70"><span className="margin-code pt-px">{index + 1}</span>{rule}</li>)}</ol></div><div><h3 className="text-sm font-bold text-ink dark:text-ink-dark">易错对比</h3><div className="mt-3 space-y-3">{lesson.contrasts.map((item) => <div key={item.wrong} className="text-xs"><p className="target-lang text-scarlet line-through dark:text-scarlet-dark">{item.wrong}</p><p className="target-lang mt-1 font-semibold text-forest dark:text-forest-dark">{item.right}</p><p className="mt-1 leading-5 text-ink/55 dark:text-ink-dark/55">{item.reason}</p></div>)}</div></div></section>
        <details className="mt-9 border-y border-ink/15 py-4 text-xs dark:border-ink-dark/20"><summary className="flex cursor-pointer items-center gap-2 font-bold text-ink/75 dark:text-ink-dark/75"><ShieldCheck className="h-4 w-4 text-forest dark:text-forest-dark" />本课如何控制准确性</summary><p className="mt-3 leading-5 text-ink/60 dark:text-ink-dark/60">课程目标、规则、例句和易错点由项目固定提供，并校验课程前置关系与内容结构；AI 只能围绕这些内容生成新情境和反馈，不能修改知识规则。外部框架用于校准能力范围，不等于对每句话的逐条背书。</p><div className="mt-3 flex flex-col gap-2">{CURRICULUM_REFERENCES.map((reference) => <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer" className="w-fit text-forest underline decoration-gilt underline-offset-4 hover:decoration-forest dark:text-forest-dark dark:hover:decoration-forest-dark">{reference.title}</a>)}</div></details>
        {generationError && <p role="alert" className="mt-6 border-l-2 border-scarlet bg-scarlet/5 p-3 text-xs leading-5 text-scarlet dark:border-scarlet-dark dark:bg-scarlet-dark/10 dark:text-scarlet-dark">{generationError}</p>}
        <div className="mt-8 flex flex-col items-end gap-2"><button type="button" disabled={isGenerating} onClick={() => { if (activities.length === DIMENSIONS.length) setPhase('practice'); else void preparePractice(true) }} className="flex items-center gap-2 rounded-md bg-forest px-5 py-3 text-xs font-bold text-paper hover:bg-forest/90 disabled:opacity-60 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90">{isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{isGenerating ? 'AI 正在后台准备练习' : activities.length === DIMENSIONS.length ? '开始 AI 引导练习' : '重新准备 AI 练习'}</button><p className="text-[10px] text-ink/45 dark:text-ink-dark/45">打开课程后即开始准备；你可以先阅读，准备完成后直接进入</p></div>
      </article>}
      {phase === 'practice' && activity && <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-12"><div className="mb-3 flex items-center gap-2 text-[11px] text-ink/55 dark:text-ink-dark/55"><Sparkles className="h-3.5 w-3.5 text-gilt dark:text-gilt-dark" />本组题目根据本课内容即时生成，不会照搬上次题目</div><div className="mb-7 flex gap-1">{activities.map((item, index) => <span key={item.id} className={`h-1 flex-1 rounded-full ${index <= activityIndex ? 'bg-forest dark:bg-forest-dark' : 'bg-ink/10 dark:bg-ink-dark/15'}`} />)}</div><ActivityPlayer key={activity.id} activity={activity} conceptId={lesson.conceptId} lesson={lesson} modelId={modelId} onAskTutor={onAskTutor} onComplete={(score) => setResults((current) => ({ ...current, [activity.id]: score }))} />{results[activity.id] !== undefined && <div className="mt-6 flex justify-end">{activityIndex < activities.length - 1 ? <button type="button" onClick={() => setActivityIndex((index) => index + 1)} className="flex items-center gap-2 rounded-md bg-forest px-4 py-2.5 text-xs font-bold text-paper hover:bg-forest/90 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90">下一题<ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={finish} className="rounded-md bg-forest px-4 py-2.5 text-xs font-bold text-paper hover:bg-forest/90 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90">完成本课</button>}</div>}</div>}
      {phase === 'result' && <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:px-8"><div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 ${lessonMastered ? 'border-forest text-forest dark:border-forest-dark dark:text-forest-dark' : 'border-gilt text-gilt dark:border-gilt-dark dark:text-gilt-dark'}`}>{lessonMastered ? <CheckCircle2 className="h-6 w-6" /> : <RotateCcw className="h-6 w-6" />}</div><h2 className="mt-4 font-display text-2xl font-semibold text-ink dark:text-ink-dark">{lessonMastered ? '本课已达到掌握标准' : '本课仍需巩固'}</h2><p className="mt-2 text-xs leading-5 text-ink/55 dark:text-ink-dark/55">{lessonMastered ? '四项能力均达到最低要求，系统已安排后续复习。' : '至少一项能力尚未达到要求，系统将在较近日期安排复习。'}</p><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{DIMENSIONS.map((item) => <div key={item.id} className="border-t border-ink/15 pt-3 dark:border-ink-dark/20"><p className="margin-code">{item.label}</p><p className="mt-1 font-display text-xl font-semibold text-ink dark:text-ink-dark">{scores[item.id]}</p></div>)}</div><div className="mt-8 text-left"><h3 className="text-sm font-bold text-ink dark:text-ink-dark">本课总结</h3><ul className="mt-3 space-y-2">{lesson.summary.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-ink/70 dark:text-ink-dark/70"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest dark:text-forest-dark" />{item}</li>)}</ul><p className="mt-5 rounded-md border border-gilt/40 bg-gilt/10 p-4 text-xs leading-5 text-ink/75 dark:border-gilt-dark/40 dark:bg-gilt-dark/10 dark:text-ink-dark/75"><strong>复习时尝试：</strong>{lesson.reviewPrompt}</p></div><button type="button" onClick={onClose} className="mt-7 rounded-md bg-forest px-5 py-2.5 text-xs font-bold text-paper hover:bg-forest/90 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90">返回课程</button></div>}
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
  return <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-ink/20 bg-leaf dark:border-ink-dark/25 dark:bg-leaf-dark lg:flex-row">
    <LearningSidebar view={view} setView={setView} dueCount={learning.dueReviews.length} />
    <div className="min-h-0 flex-1 overflow-hidden">
      {view === 'home' && <div className="h-full overflow-y-auto"><HomeView getProgress={learning.getProgress} suggestedId={learning.suggestedConceptId} onOpenConcept={openConcept} setView={setView} /></div>}
      {view === 'routes' && <RoutesView selectedRouteId={learning.selectedRouteId} setSelectedRouteId={learning.setSelectedRouteId} getProgress={learning.getProgress} onOpenConcept={openConcept} />}
      {view === 'review' && <ReviewView dueReviews={learning.dueReviews} getProgress={learning.getProgress} onOpenConcept={openConcept} />}
    </div>
    {loadingConceptId && <div role="status" aria-live="polite" className="absolute inset-0 z-30 flex items-center justify-center bg-leaf/70 backdrop-blur-sm dark:bg-leaf-dark/70"><span className="rounded-md border border-ink/20 bg-leaf px-4 py-3 text-xs font-bold text-ink/75 shadow-lg dark:border-ink-dark/25 dark:bg-leaf-dark dark:text-ink-dark/75">正在打开课程…</span></div>}
    {courseLoadError && <div role="alert" className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-md border border-scarlet/40 bg-scarlet/10 px-4 py-3 text-xs text-scarlet shadow-lg dark:border-scarlet-dark/50 dark:bg-scarlet-dark/15 dark:text-scarlet-dark"><span>课程内容加载失败，请检查网络后重试。</span><button type="button" onClick={() => setCourseLoadError(false)} className="font-bold">关闭</button></div>}
    {outlineConcept && <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6" onClick={() => setOutlineConcept(null)}><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-t-2xl border-t-2 border-ink bg-leaf p-5 shadow-2xl dark:border-ink-dark dark:bg-leaf-dark sm:rounded-lg sm:border-2" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="margin-code">{conceptCode(outlineConcept)} · {LEARNING_LEVELS.find((item) => item.id === outlineConcept.level)?.label} · {LEARNING_DOMAINS.find((item) => item.id === outlineConcept.domain)?.title}</p><h3 className="mt-1 font-display text-xl font-semibold text-ink dark:text-ink-dark">{outlineConcept.title}</h3></div><button type="button" onClick={() => setOutlineConcept(null)} className="rounded-md p-2 text-ink/45 hover:bg-ink/5 dark:text-ink-dark/45 dark:hover:bg-ink-dark/10"><X className="h-4 w-4" /></button></div><p className="mt-4 text-sm leading-6 text-ink/70 dark:text-ink-dark/70">{outlineConcept.summary}</p><div className="mt-5 border-y border-ink/15 py-4 dark:border-ink-dark/20"><p className="text-xs font-bold text-ink/85 dark:text-ink-dark/85">学完能够</p><p className="mt-1 text-xs leading-5 text-ink/60 dark:text-ink-dark/60">{outlineConcept.canDo}</p></div><div className="mt-4"><p className="text-xs font-bold text-ink/85 dark:text-ink-dark/85">内容范围</p><div className="mt-2 flex flex-wrap gap-2">{outlineConcept.topics.map((topic) => <span key={topic} className="rounded-md border border-ink/15 px-2 py-1 text-[11px] text-ink/65 dark:border-ink-dark/20 dark:text-ink-dark/65">{topic}</span>)}</div></div><p className="mt-5 text-[11px] text-ink/45 dark:text-ink-dark/45">知识范围与掌握标准已经确定，详细课程内容正在按前置顺序编写。</p></div></div>}
  </div>
}
