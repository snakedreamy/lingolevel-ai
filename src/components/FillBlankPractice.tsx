import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpenCheck, Check, CheckCircle2,
  CircleHelp, Lightbulb, ListTree, LoaderCircle, Minus, PenLine, Plus, RotateCcw, Sparkles,
  Target, TextCursorInput, TriangleAlert, XCircle,
} from 'lucide-react'
import { LEVELS } from '../data/levels'
import { useFillBlankPractice } from '../hooks/useFillBlankPractice'
import type { SpeechPlayer } from '../lib/speech'
import { FILL_BLANK_MAX_COUNT, FILL_BLANK_MIN_COUNT } from '../types'
import type { DifficultyLevel, FillBlankCard, FillBlankFocus, Scenario } from '../types'
import SpeechButton from './SpeechButton'

interface FillBlankPracticeProps {
  active: boolean
  level: DifficultyLevel
  scenario: Scenario
  modelId: string
  onLevelChange: (level: DifficultyLevel) => void
  onAskWord: (word: string) => void
  onBackToChat: () => void
  speech: SpeechPlayer
}

const FOCUS_OPTIONS: Array<{ id: FillBlankFocus; label: string; detail: string; scope: string }> = [
  {
    id: 'mixed', label: '综合', detail: '一组中同时练词汇选择和语法形式',
    scope: '约一半考实词与搭配，另一半考时态、介词、连接词或动词形式，适合日常综合复习。',
  },
  {
    id: 'vocabulary', label: '词汇', detail: '只把名词、实义动词、形容词或副词设为空格',
    scope: '依靠上下文判断词义与固定搭配，不会用冠词、代词或纯语法功能词充当答案。',
  },
  {
    id: 'grammar', label: '语法', detail: '专门判断词形、时态和句子连接关系',
    scope: '重点练动词形式、介词、连词、冠词、情态动词与从句连接，并解释为什么不能用常见错误形式。',
  },
]

function fullSentence(card: FillBlankCard) {
  return card.sentence.replace('{{blank}}', card.answer)
}

function Sentence({ card, reveal }: { card: FillBlankCard; reveal: boolean }) {
  const [before, after] = card.sentence.split('{{blank}}')
  return (
    <p className="text-[clamp(1.55rem,4.2vw,3.35rem)] font-semibold leading-[1.35] tracking-[-0.035em] text-zinc-950 dark:text-white">
      {before}
      <span className={`mx-1 inline-flex min-w-[4.5ch] items-center justify-center border-b-2 px-1 transition-all duration-300 sm:mx-2 ${
        reveal
          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
          : 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
      }`}>
        {reveal ? card.answer : '\u00a0'}
      </span>
      {after}
    </p>
  )
}

function SetupView({
  count, setCount, focus, setFocus, level, scenario, error, onLevelChange, onStart,
}: {
  count: number
  setCount: (count: number) => void
  focus: FillBlankFocus
  setFocus: (focus: FillBlankFocus) => void
  level: DifficultyLevel
  scenario: Scenario
  error: string | null
  onLevelChange: (level: DifficultyLevel) => void
  onStart: () => void
}) {
  const activeFocus = FOCUS_OPTIONS.find((option) => option.id === focus) ?? FOCUS_OPTIONS[0]
  return (
    <div className="fill-blank-enter mx-auto h-full w-full max-w-6xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center border-b border-zinc-200 px-5 py-5 dark:border-zinc-800 sm:px-8 sm:py-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
            <TextCursorInput className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-2xl">生成填词练习</h2>
        </div>
      </header>

      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
        <section className="space-y-6" aria-labelledby="fill-basic-settings">
          <h3 id="fill-basic-settings" className="text-base font-bold text-zinc-900 dark:text-zinc-100">基础设置</h3>
          <div>
            <div className="mb-2.5">
              <label htmlFor="fill-level" className="text-sm font-bold text-zinc-800 dark:text-zinc-200">当前难度</label>
            </div>
            <select id="fill-level" value={level} onChange={(event) => onLevelChange(event.target.value as DifficultyLevel)}
              className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:[color-scheme:dark] dark:focus:ring-indigo-900">
              {LEVELS.map((item) => <option key={item.id} value={item.id} className="bg-white text-zinc-950 dark:bg-zinc-900 dark:text-zinc-100">{item.name}</option>)}
            </select>
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">句子数量</span>
              <span className="text-xs text-zinc-500">{FILL_BLANK_MIN_COUNT}–{FILL_BLANK_MAX_COUNT} 题</span>
            </div>
            <div className="flex h-14 items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-2 dark:border-zinc-700 dark:bg-zinc-950">
              <button type="button" onClick={() => setCount(count - 1)} disabled={count <= FILL_BLANK_MIN_COUNT}
                className="grid h-10 w-10 place-items-center rounded-lg text-zinc-500 transition hover:bg-white disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="减少题目">
                <Minus className="h-4 w-4" />
              </button>
              <label className="flex items-baseline gap-1">
                <select aria-label="句子数量" value={count} onChange={(event) => setCount(Number(event.target.value))}
                  className="appearance-none bg-transparent text-center text-2xl font-black text-zinc-950 outline-none dark:text-zinc-100 dark:[color-scheme:dark]">
                  {Array.from({ length: FILL_BLANK_MAX_COUNT - FILL_BLANK_MIN_COUNT + 1 }, (_, index) => index + FILL_BLANK_MIN_COUNT)
                    .map((value) => <option key={value} value={value} className="bg-white text-zinc-950 dark:bg-zinc-900 dark:text-zinc-100">{value}</option>)}
                </select>
                <span className="text-xs text-zinc-500">句</span>
              </label>
              <button type="button" onClick={() => setCount(count + 1)} disabled={count >= FILL_BLANK_MAX_COUNT}
                className="grid h-10 w-10 place-items-center rounded-lg text-zinc-500 transition hover:bg-white disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="增加题目">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col" aria-labelledby="fill-focus-settings">
          <div>
            <h3 id="fill-focus-settings" className="mb-3 text-base font-bold text-zinc-900 dark:text-zinc-100">练习重点</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {FOCUS_OPTIONS.map((option) => (
                <button key={option.id} type="button" aria-pressed={focus === option.id} onClick={() => setFocus(option.id)}
                  className={`min-h-20 rounded-xl border px-3 py-3 text-left transition ${focus === option.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:ring-indigo-900'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300'}`}>
                  <span className="block text-xs font-bold">{option.label}</span>
                  <span className="mt-1.5 block text-[10.5px] leading-4 text-zinc-500 dark:text-zinc-400">{option.detail}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 border-l-2 border-indigo-500 pl-3 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
              <strong className="font-bold text-zinc-900 dark:text-zinc-100">{activeFocus.label}模式：</strong>{activeFocus.scope}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2 border-t border-zinc-200 pt-5 text-xs text-zinc-500 dark:border-zinc-800">
            <Target className="h-4 w-4 text-indigo-500" /> 当前场景：{scenario.name}
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
          <button type="button" onClick={onStart}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold text-white transition hover:bg-indigo-500 active:scale-[.99]">
            <Sparkles className="h-4 w-4" /> 生成 {count} 张句子卡片
          </button>
        </section>
      </div>
    </div>
  )
}

function LoadingView({ count }: { count: number }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="max-w-sm px-6 text-center">
        <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-zinc-950 dark:text-white">正在准备 {count} 个新语境</h2>
        <div className="mx-auto mt-7 h-1.5 max-w-52 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="fill-blank-loading h-full w-1/2 rounded-full bg-indigo-500" />
        </div>
      </div>
    </div>
  )
}

export default function FillBlankPractice(props: FillBlankPracticeProps) {
  const practice = useFillBlankPractice({ level: props.level, scenario: props.scenario, modelId: props.modelId })
  const [showHint, setShowHint] = useState(false)
  const [answerError, setAnswerError] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setShowHint(false)
    setAnswerError(false)
  }, [practice.currentIndex, practice.phase])

  useEffect(() => {
    if (!props.active) {
      inputRef.current?.blur()
      return
    }
    if (practice.phase !== 'active') return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [practice.currentIndex, practice.phase, props.active])

  if (practice.phase === 'setup') {
    return <SetupView count={practice.count} setCount={practice.setCount} focus={practice.focus}
      setFocus={practice.setFocus} level={props.level} scenario={props.scenario} error={practice.error}
      onLevelChange={props.onLevelChange} onStart={() => { void practice.start() }} />
  }
  if (practice.phase === 'loading') return <LoadingView count={practice.count} />

  if (practice.phase === 'complete') {
    const score = practice.stats.total ? Math.round((practice.stats.firstTry / practice.stats.total) * 100) : 0
    const reviewCards = practice.cards.filter((card) => {
      const item = practice.progress[card.id]
      return item && (item.attempts > 0 || item.status === 'revealed')
    })
    return (
      <div className="fill-blank-enter mx-auto h-full w-full max-w-5xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-9">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-7 dark:border-zinc-800">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">你完成了 {practice.stats.total} 个句子</h2>
            </div>
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-indigo-100 text-indigo-600 dark:border-indigo-950 dark:text-indigo-400">
              <span className="text-2xl font-black">{score}</span><span className="text-[9px] font-bold">首答分</span>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-zinc-200 py-6 text-center dark:divide-zinc-800">
            <div><strong className="block text-2xl text-emerald-600">{practice.stats.firstTry}</strong><span className="text-xs text-zinc-500">一次答对</span></div>
            <div><strong className="block text-2xl text-amber-600">{practice.stats.corrected}</strong><span className="text-xs text-zinc-500">纠正后答对</span></div>
            <div><strong className="block text-2xl text-zinc-500">{practice.stats.revealed}</strong><span className="text-xs text-zinc-500">查看答案</span></div>
          </div>

          <section className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100"><BookOpenCheck className="h-4 w-4 text-indigo-500" /> 本组复习</h3>
            {reviewCards.length ? (
              <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                {reviewCards.map((card) => (
                  <div key={card.id} className="py-4 sm:flex sm:items-start sm:justify-between sm:gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        <p className="min-w-0 flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fullSentence(card)}</p>
                        <SpeechButton active={props.speech.activeId === `fill:${card.id}:review`}
                          onClick={() => props.speech.toggle(`fill:${card.id}:review`, fullSentence(card), '复习句子')}
                          label="复习句子" />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{card.translation}</p>
                    </div>
                    <div className="mt-2 shrink-0 text-left sm:mt-0 sm:text-right">
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{card.answer} <span className="font-normal text-zinc-400">{card.phonetic}</span></p>
                      <p className="text-[11px] text-zinc-500">{card.grammarPoint}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">全部一次答对，这组掌握得很稳。</p>}
          </section>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={props.onBackToChat} className="h-11 rounded-xl px-5 text-sm font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">返回对话练习</button>
            <button type="button" onClick={practice.resetToSetup} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-500"><RotateCcw className="h-4 w-4" /> 再练一组</button>
          </div>
        </div>
      </div>
    )
  }

  const card = practice.currentCard
  const item = practice.currentProgress
  if (!card || !item) return null
  const settled = item.status !== 'answering'
  const sentenceSpeechId = `fill:${card.id}:sentence`

  const handleSubmit = () => {
    const result = practice.submit()
    if (result === false) { setAnswerError(true); setShowHint(true) }
  }

  return (
    <div className="fill-blank-enter mx-auto flex h-full w-full max-w-6xl min-h-0 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/40 md:flex md:flex-col">
        <div>
          <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">学习进度</p>
          <p className="mt-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{LEVELS.find((entry) => entry.id === props.level)?.name}</p>
          <p className="mt-1 text-xs text-zinc-500">{props.scenario.name}</p>
        </div>
        <ol className="mt-7 space-y-1">
          {practice.cards.map((entry, index) => {
            const state = practice.progress[entry.id]
            const active = index === practice.currentIndex
            return (
              <li key={entry.id} className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${active ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white' : 'text-zinc-500'}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] ${state?.status === 'correct' ? 'border-emerald-500 bg-emerald-500 text-white' : state?.status === 'revealed' ? 'border-amber-500 bg-amber-500 text-white' : active ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-zinc-300 dark:border-zinc-700'}`}>
                  {state?.status === 'correct' ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                句子 {index + 1}
              </li>
            )
          })}
        </ol>
        <button type="button" onClick={practice.resetToSetup} className="mt-auto flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"><ArrowLeft className="h-3.5 w-3.5" /> 结束本组</button>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-7">
          <div className="flex flex-1 gap-1.5 md:hidden" aria-label="答题进度">
            {practice.cards.map((entry, index) => (
              <span key={entry.id} className={`h-1.5 flex-1 rounded-full transition-colors ${index < practice.currentIndex ? 'bg-emerald-500' : index === practice.currentIndex ? 'bg-indigo-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
            ))}
          </div>
          <span className="ml-auto whitespace-nowrap text-xs font-bold text-zinc-500">{practice.currentIndex + 1} / {practice.cards.length}</span>
          <button type="button" onClick={practice.resetToSetup} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 md:hidden dark:hover:bg-zinc-800" aria-label="结束本组"><XCircle className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-9 sm:py-10 lg:px-14">
          <div className="mx-auto max-w-3xl">
            {practice.isFallback && practice.currentIndex === 0 && (
              <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                本组有 {practice.fallbackCount || '部分'} 题的 AI 生成结果不完整，已用同级备用题补齐；可以正常练习。
              </p>
            )}
            <div className="mt-7 min-h-32 sm:mt-10 sm:min-h-44">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1"><Sentence card={card} reveal={settled} /></div>
                <SpeechButton active={props.speech.activeId === sentenceSpeechId}
                  onClick={() => props.speech.toggle(
                    sentenceSpeechId,
                    settled ? fullSentence(card) : card.sentence.replace('{{blank}}', ' '),
                    settled ? '完整句子' : '题干',
                  )}
                  label={settled ? '完整句子' : '题干'} size="md" />
              </div>
              <p className="mt-5 text-sm leading-6 text-zinc-500 sm:text-base">{card.translation}</p>
            </div>

            {!settled ? (
              <div className="mt-7 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <label htmlFor="fill-answer" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">填写缺少的单词</label>
                <div className={`mt-2 flex items-center rounded-xl border bg-zinc-50 pr-2 transition focus-within:ring-2 dark:bg-zinc-950 ${answerError ? 'border-rose-400 focus-within:ring-rose-100 dark:focus-within:ring-rose-950' : 'border-zinc-200 focus-within:border-indigo-500 focus-within:ring-indigo-100 dark:border-zinc-700 dark:focus-within:ring-indigo-950'}`}>
                  <input ref={inputRef} id="fill-answer" value={item.input} onChange={(event) => { practice.updateInput(event.target.value); setAnswerError(false) }}
                    onKeyDown={(event) => { if (event.key === 'Enter') handleSubmit() }} autoComplete="off" autoCapitalize="none" spellCheck={false}
                    placeholder="输入答案" className="h-13 min-w-0 flex-1 bg-transparent px-4 text-base font-semibold text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:text-white" />
                  <button type="button" onClick={handleSubmit} disabled={!item.input.trim()}
                    className="h-9 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700">检查</button>
                </div>
                {answerError && (
                  <div role="alert" className="mt-3 flex items-start gap-2 text-xs leading-5 text-rose-600 dark:text-rose-400">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> 还差一点。看看提示，再结合中文和句子结构试一次。
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setShowHint((value) => !value)} className="flex items-center gap-2 text-xs font-bold text-amber-600 hover:text-amber-500 dark:text-amber-400"><Lightbulb className="h-4 w-4" /> {showHint ? '收起提示' : '需要提示'}</button>
                  <button type="button" onClick={practice.reveal} className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">查看答案</button>
                </div>
                {showHint && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/25 dark:text-amber-200">{card.hint} · {card.answer.length} 个字母</p>}
              </div>
            ) : (
              <div className="fill-blank-feedback mt-7 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${item.status === 'correct' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/25 dark:text-amber-200'}`}>
                  {item.status === 'correct' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <CircleHelp className="mt-0.5 h-5 w-5 shrink-0" />}
                  <div><p className="text-sm font-bold">{item.status === 'correct' ? (item.attempts ? '纠正成功，记住这个语境。' : '回答正确！') : `答案是 ${card.answer}`}</p><p className="mt-1 text-xs opacity-80">{card.explanation}</p></div>
                </div>

                <section className="mt-6" aria-labelledby="fill-answer-teaching">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p id="fill-answer-teaching" className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">答案与用法</p>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                        <strong className="text-2xl text-zinc-950 dark:text-white">{card.answer}</strong>
                        <span className="text-xs text-zinc-400">{card.phonetic}</span>
                        <span className="text-[10px] font-bold text-indigo-500">{card.partOfSpeech}</span>
                        <SpeechButton active={props.speech.activeId === `fill:${card.id}:answer`}
                          onClick={() => props.speech.toggle(`fill:${card.id}:answer`, card.answer, card.answer)}
                          label={card.answer} />
                      </div>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{card.definition}</p>
                    </div>
                    <span className="border-l-2 border-indigo-500 pl-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                      本题考查：{card.focusType === 'grammar' ? '语法形式' : '词义与搭配'}
                    </span>
                  </div>
                  <div className="mt-3">
                    <button type="button" onClick={() => props.onAskWord(card.answer)} className="text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">问老师</button>
                  </div>
                </section>

                <section className="mt-7 border-t border-zinc-200 pt-6 dark:border-zinc-800" aria-labelledby="fill-sentence-breakdown">
                  <div className="flex items-center gap-2">
                    <ListTree className="h-4 w-4 text-indigo-500" />
                    <h3 id="fill-sentence-breakdown" className="text-sm font-bold text-zinc-950 dark:text-white">句子拆解</h3>
                  </div>
                  <div className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {card.breakdown.map((chunk, index) => (
                      <div key={`${chunk.text}-${index}`} className="grid gap-1 py-3 sm:grid-cols-[minmax(8rem,0.9fr)_minmax(7rem,0.7fr)_2fr] sm:gap-4">
                        <div className="flex min-w-0 items-start gap-1">
                          <p className="min-w-0 flex-1 text-sm font-bold text-zinc-950 dark:text-white">{chunk.text}</p>
                          <SpeechButton active={props.speech.activeId === `fill:${card.id}:chunk:${index}`}
                            onClick={() => props.speech.toggle(`fill:${card.id}:chunk:${index}`, chunk.text, '句子片段')}
                            label="句子片段" />
                        </div>
                        <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{chunk.role}</p>
                        <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-300">{chunk.explanation}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-7 border-t border-zinc-200 pt-6 dark:border-zinc-800" aria-labelledby="fill-imitation-guide">
                  <div className="flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-indigo-500" />
                    <h3 id="fill-imitation-guide" className="text-sm font-bold text-zinc-950 dark:text-white">仿写</h3>
                  </div>
                  <div className="mt-4 border-l-2 border-indigo-500 pl-4">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{card.grammarPoint}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">句型：{card.structure}</p>
                  </div>
                  <ol className="mt-4 space-y-3">
                    {card.imitation.steps.map((step, index) => (
                      <li key={index} className="flex gap-3 text-xs leading-5 text-zinc-700 dark:text-zinc-300">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  {card.imitation.example && (
                    <div className="mt-5 bg-zinc-50 px-4 py-3 dark:bg-zinc-950/60">
                      <p className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">仿写示例</p>
                      <div className="mt-1.5 flex items-start gap-2">
                        <p className="min-w-0 flex-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">{card.imitation.example}</p>
                        <SpeechButton active={props.speech.activeId === `fill:${card.id}:imitation`}
                          onClick={() => props.speech.toggle(`fill:${card.id}:imitation`, card.imitation.example, '仿写例句')}
                          label="仿写例句" />
                      </div>
                      {card.imitation.translation && <p className="mt-1 text-xs text-zinc-500">{card.imitation.translation}</p>}
                    </div>
                  )}
                  {card.imitation.caution && (
                    <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <p><strong>注意：</strong>{card.imitation.caution}</p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>

        {settled && (
          <div className="border-t border-zinc-200 bg-white px-5 py-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-900 sm:px-9">
            <div className="mx-auto flex max-w-3xl justify-end">
              <button type="button" onClick={practice.next} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-500 sm:w-auto">
                {practice.currentIndex === practice.cards.length - 1 ? '查看本组总结' : '下一题'} {practice.currentIndex === practice.cards.length - 1 ? <BookOpenCheck className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
