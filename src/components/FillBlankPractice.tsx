// src/components/FillBlankPractice.tsx
// 版式：一张油印练习卷。题干是超大斜体衬线句，空格是手写空线；
// 答对空线转墨绿，答错朱笔批注——整页只有这一处色彩判断。
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpenCheck, Check, CheckCircle2,
  CircleHelp, Lightbulb, ListTree, LoaderCircle, Minus, PenLine, Plus, RotateCcw, Sparkles,
  TextCursorInput, TriangleAlert, XCircle,
} from './Icon'
import { LEVELS } from '../data/levels'
import { useFillBlankPractice } from '../hooks/useFillBlankPractice'
import type { SpeechPlayer } from '../lib/speech'
import { FILL_BLANK_MAX_COUNT, FILL_BLANK_MIN_COUNT } from '../types'
import type { DifficultyLevel, FillBlankCard, FillBlankFocus } from '../types'
import SpeechButton from './SpeechButton'

interface FillBlankPracticeProps {
  active: boolean
  level: DifficultyLevel
  modelId: string
  onLevelChange: (level: DifficultyLevel) => void
  onAskWord: (word: string) => void
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
    <p className="target-lang text-[clamp(1.55rem,4.2vw,3.1rem)] font-medium leading-[1.4] tracking-[-0.01em] text-ink dark:text-ink-dark">
      {before}
      <span className={`mx-1 inline-flex min-w-[4.5ch] items-center justify-center border-b-2 px-1 transition-all duration-300 sm:mx-2 ${
        reveal
          ? 'border-forest text-forest dark:border-forest-dark dark:text-forest-dark'
          : 'border-dashed border-ink/40 text-ink/30 dark:border-ink-dark/40 dark:text-ink-dark/30'
      }`}>
        {reveal ? card.answer : ' '}
      </span>
      {after}
    </p>
  )
}

function SetupView({
  count, setCount, focus, setFocus, level, error, onLevelChange, onStart,
}: {
  count: number
  setCount: (count: number) => void
  focus: FillBlankFocus
  setFocus: (focus: FillBlankFocus) => void
  level: DifficultyLevel
  error: string | null
  onLevelChange: (level: DifficultyLevel) => void
  onStart: () => void
}) {
  const activeFocus = FOCUS_OPTIONS.find((option) => option.id === focus) ?? FOCUS_OPTIONS[0]
  return (
    <div className="fill-blank-enter mx-auto h-full w-full max-w-6xl overflow-y-auto rounded-lg border border-ink/20 bg-leaf dark:border-ink-dark/25 dark:bg-leaf-dark">
      <header className="flex items-center justify-between border-b border-ink/15 px-5 py-5 dark:border-ink-dark/20 sm:px-8 sm:py-6">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink dark:text-ink-dark sm:text-2xl">生成填词练习</h2>
          <span className="margin-code">贰 · 填空</span>
        </div>
        <TextCursorInput className="h-5 w-5 text-ink/30 dark:text-ink-dark/30" />
      </header>

      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
        <section className="space-y-6" aria-labelledby="fill-basic-settings">
          <h3 id="fill-basic-settings" className="text-base font-bold text-ink dark:text-ink-dark">基础设置</h3>
          <div>
            <div className="mb-2.5">
              <label htmlFor="fill-level" className="text-sm font-bold text-ink/85 dark:text-ink-dark/85">当前难度</label>
            </div>
            <select id="fill-level" value={level} onChange={(event) => onLevelChange(event.target.value as DifficultyLevel)}
              className="h-12 w-full rounded-md border border-ink/20 bg-paper px-3 text-sm font-semibold text-ink outline-none transition focus:border-forest focus:ring-1 focus:ring-forest/40 dark:border-ink-dark/25 dark:bg-paper-dark dark:text-ink-dark dark:[color-scheme:dark] dark:focus:border-forest-dark">
              {LEVELS.map((item) => <option key={item.id} value={item.id} className="bg-leaf text-ink dark:bg-leaf-dark dark:text-ink-dark">{item.name}</option>)}
            </select>
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-sm font-bold text-ink/85 dark:text-ink-dark/85">句子数量</span>
              <span className="text-xs text-ink/50 dark:text-ink-dark/50">{FILL_BLANK_MIN_COUNT}–{FILL_BLANK_MAX_COUNT} 题</span>
            </div>
            <div className="flex h-14 items-center justify-between rounded-md border border-ink/20 bg-paper px-2 dark:border-ink-dark/25 dark:bg-paper-dark">
              <button type="button" onClick={() => setCount(count - 1)} disabled={count <= FILL_BLANK_MIN_COUNT}
                className="grid h-10 w-10 place-items-center rounded-md text-ink/50 transition hover:bg-ink/5 disabled:opacity-30 dark:text-ink-dark/50 dark:hover:bg-ink-dark/10" aria-label="减少题目">
                <Minus className="h-4 w-4" />
              </button>
              <label className="flex items-baseline gap-1">
                <select aria-label="句子数量" value={count} onChange={(event) => setCount(Number(event.target.value))}
                  className="appearance-none bg-transparent text-center font-display text-2xl font-semibold text-ink outline-none dark:text-ink-dark dark:[color-scheme:dark]">
                  {Array.from({ length: FILL_BLANK_MAX_COUNT - FILL_BLANK_MIN_COUNT + 1 }, (_, index) => index + FILL_BLANK_MIN_COUNT)
                    .map((value) => <option key={value} value={value} className="bg-leaf text-ink dark:bg-leaf-dark dark:text-ink-dark">{value}</option>)}
                </select>
                <span className="text-xs text-ink/50 dark:text-ink-dark/50">句</span>
              </label>
              <button type="button" onClick={() => setCount(count + 1)} disabled={count >= FILL_BLANK_MAX_COUNT}
                className="grid h-10 w-10 place-items-center rounded-md text-ink/50 transition hover:bg-ink/5 disabled:opacity-30 dark:text-ink-dark/50 dark:hover:bg-ink-dark/10" aria-label="增加题目">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col" aria-labelledby="fill-focus-settings">
          <div>
            <h3 id="fill-focus-settings" className="mb-3 text-base font-bold text-ink dark:text-ink-dark">练习重点</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {FOCUS_OPTIONS.map((option) => (
                <button key={option.id} type="button" aria-pressed={focus === option.id} onClick={() => setFocus(option.id)}
                  className={`min-h-20 rounded-md border px-3 py-3 text-left transition ${focus === option.id
                    ? 'border-forest bg-forest/5 ring-1 ring-forest/30 dark:border-forest-dark dark:bg-forest-dark/10 dark:ring-forest-dark/30'
                    : 'border-ink/15 text-ink/60 hover:border-ink/40 dark:border-ink-dark/20 dark:text-ink-dark/60 dark:hover:border-ink-dark/50'}`}>
                  <span className="block text-xs font-bold text-ink dark:text-ink-dark">{option.label}</span>
                  <span className="mt-1.5 block text-[10.5px] leading-4 text-ink/50 dark:text-ink-dark/50">{option.detail}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 border-l-2 border-gilt pl-3 text-xs leading-5 text-ink/70 dark:border-gilt-dark dark:text-ink-dark/70">
              <strong className="font-bold text-ink dark:text-ink-dark">{activeFocus.label}模式：</strong>{activeFocus.scope}
            </p>
          </div>

          {error && <p role="alert" className="mt-4 rounded-md border border-scarlet/30 bg-scarlet/5 px-3 py-2 text-xs text-scarlet dark:border-scarlet-dark/40 dark:bg-scarlet-dark/10 dark:text-scarlet-dark">{error}</p>}
          <button type="button" onClick={onStart}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-forest text-sm font-bold text-paper transition hover:bg-forest/90 active:scale-[.99] dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90">
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
        <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border border-ink/15 text-forest dark:border-ink-dark/20 dark:text-forest-dark">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
        <h2 className="mt-6 font-display text-xl font-semibold text-ink dark:text-ink-dark">正在准备 {count} 个新语境</h2>
        <div className="mx-auto mt-7 h-1 max-w-52 overflow-hidden rounded-full bg-ink/10 dark:bg-ink-dark/15">
          <div className="fill-blank-loading h-full w-1/2 rounded-full bg-forest dark:bg-forest-dark" />
        </div>
      </div>
    </div>
  )
}

export default function FillBlankPractice(props: FillBlankPracticeProps) {
  const practice = useFillBlankPractice({ level: props.level, modelId: props.modelId })
  const [showHint, setShowHint] = useState(false)
  const [answerError, setAnswerError] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const activeStepRef = useRef<HTMLLIElement | null>(null)

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
    if (!window.matchMedia('(pointer: fine)').matches) return
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80)
    return () => window.clearTimeout(timer)
  }, [practice.currentIndex, practice.phase, props.active])

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
    activeStepRef.current?.scrollIntoView({ block: 'nearest' })
  }, [practice.currentIndex])

  if (practice.phase === 'setup') {
    return <SetupView count={practice.count} setCount={practice.setCount} focus={practice.focus}
      setFocus={practice.setFocus} level={props.level} error={practice.error}
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
      <div className="fill-blank-enter mx-auto h-full w-full max-w-5xl overflow-y-auto rounded-lg border border-ink/20 bg-leaf p-5 dark:border-ink-dark/25 dark:bg-leaf-dark sm:p-9">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start justify-between gap-4 border-b border-ink/15 pb-7 dark:border-ink-dark/20">
            <div>
              <span className="margin-code">本组批阅结果</span>
              <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink dark:text-ink-dark sm:text-3xl">你完成了 {practice.stats.total} 个句子</h2>
            </div>
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-2 border-forest text-forest dark:border-forest-dark dark:text-forest-dark">
              <span className="font-display text-2xl font-semibold">{score}</span><span className="text-[9px] font-bold">首答分</span>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-ink/10 py-6 text-center dark:divide-ink-dark/15">
            <div><strong className="block font-display text-2xl font-semibold text-forest dark:text-forest-dark">{practice.stats.firstTry}</strong><span className="text-xs text-ink/50 dark:text-ink-dark/50">一次答对</span></div>
            <div><strong className="block font-display text-2xl font-semibold text-gilt dark:text-gilt-dark">{practice.stats.corrected}</strong><span className="text-xs text-ink/50 dark:text-ink-dark/50">纠正后答对</span></div>
            <div><strong className="block font-display text-2xl font-semibold text-ink/50 dark:text-ink-dark/50">{practice.stats.revealed}</strong><span className="text-xs text-ink/50 dark:text-ink-dark/50">查看答案</span></div>
          </div>

          <section className="border-t border-ink/15 pt-6 dark:border-ink-dark/20">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink dark:text-ink-dark"><BookOpenCheck className="h-4 w-4 text-forest dark:text-forest-dark" /> 本组复习</h3>
            {reviewCards.length ? (
              <div className="mt-4 divide-y divide-ink/10 dark:divide-ink-dark/15">
                {reviewCards.map((card) => (
                  <div key={card.id} className="py-4 sm:flex sm:items-start sm:justify-between sm:gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        <p className="target-lang min-w-0 flex-1 text-sm text-ink dark:text-ink-dark">{fullSentence(card)}</p>
                        <SpeechButton active={props.speech.activeId === `fill:${card.id}:review`}
                          onClick={() => props.speech.toggle(`fill:${card.id}:review`, fullSentence(card), '复习句子')}
                          label="复习句子" />
                      </div>
                      <p className="mt-1 text-xs text-ink/50 dark:text-ink-dark/50">{card.translation}</p>
                    </div>
                    <div className="mt-2 shrink-0 text-left sm:mt-0 sm:text-right">
                      <p className="font-display text-sm font-semibold text-forest dark:text-forest-dark">{card.answer} <span className="font-mono text-xs font-normal text-ink/40 dark:text-ink-dark/40">{card.phonetic}</span></p>
                      <p className="text-[11px] text-ink/50 dark:text-ink-dark/50">{card.grammarPoint}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="mt-4 border-l-2 border-forest py-0.5 pl-3 text-sm text-forest dark:border-forest-dark dark:text-forest-dark">全部一次答对，这组掌握得很稳。</p>}
          </section>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={practice.resetToSetup} className="flex h-11 items-center justify-center gap-2 rounded-md bg-forest px-5 text-sm font-bold text-paper hover:bg-forest/90 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90"><RotateCcw className="h-4 w-4" /> 再练一组</button>
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
    <div className="fill-blank-shell fill-blank-enter mx-auto flex h-full min-h-0 w-full max-w-6xl overflow-hidden rounded-lg border border-ink/20 bg-leaf dark:border-ink-dark/25 dark:bg-leaf-dark">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink/15 bg-paper p-5 dark:border-ink-dark/20 dark:bg-paper-dark md:flex">
        <div>
          <p className="margin-code">练习卷 · 进度</p>
          <p className="mt-2 text-sm font-semibold text-ink dark:text-ink-dark">{LEVELS.find((entry) => entry.id === props.level)?.name}</p>
        </div>
        <ol className="mt-7 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {practice.cards.map((entry, index) => {
            const state = practice.progress[entry.id]
            const active = index === practice.currentIndex
            return (
              <li ref={active ? activeStepRef : undefined} key={entry.id} className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-xs font-semibold transition ${active ? 'bg-leaf text-ink dark:bg-leaf-dark dark:text-ink-dark' : 'text-ink/50 dark:text-ink-dark/50'}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] ${state?.status === 'correct' ? 'border-forest bg-forest text-paper dark:border-forest-dark dark:bg-forest-dark dark:text-paper-dark' : state?.status === 'revealed' ? 'border-gilt bg-gilt text-paper dark:border-gilt-dark dark:bg-gilt-dark dark:text-paper-dark' : active ? 'border-forest text-forest dark:border-forest-dark dark:text-forest-dark' : 'border-ink/25 dark:border-ink-dark/30'}`}>
                  {state?.status === 'correct' ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                句子 {index + 1}
              </li>
            )
          })}
        </ol>
        <button type="button" onClick={practice.resetToSetup} className="mt-4 flex h-10 shrink-0 items-center gap-2 border-t border-ink/10 pt-4 text-xs font-semibold text-ink/50 hover:text-ink dark:border-ink-dark/15 dark:text-ink-dark/50 dark:hover:text-ink-dark"><ArrowLeft className="h-3.5 w-3.5" /> 结束本组</button>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-ink/10 px-4 py-3 dark:border-ink-dark/15 sm:px-7">
          <div className="flex flex-1 gap-1.5 md:hidden" aria-label="答题进度">
            {practice.cards.map((entry, index) => (
              <span key={entry.id} className={`h-1 flex-1 rounded-full transition-colors ${index < practice.currentIndex ? 'bg-forest dark:bg-forest-dark' : index === practice.currentIndex ? 'bg-gilt dark:bg-gilt-dark' : 'bg-ink/10 dark:bg-ink-dark/15'}`} />
            ))}
          </div>
          <span className="margin-code ml-auto whitespace-nowrap">第 {practice.currentIndex + 1} / {practice.cards.length} 题</span>
          <button type="button" onClick={practice.resetToSetup} className="rounded-md p-1.5 text-ink/40 hover:bg-ink/5 dark:text-ink-dark/40 dark:hover:bg-ink-dark/10 md:hidden" aria-label="结束本组"><XCircle className="h-4 w-4" /></button>
        </div>

        <div ref={contentRef} className="fill-blank-content min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-9 sm:py-10 lg:px-14">
          <div className="mx-auto max-w-3xl">
            {practice.isFallback && practice.currentIndex === 0 && (
              <p className="fill-blank-fallback-notice mb-5 rounded-md border border-gilt/40 bg-gilt/10 px-3 py-2 text-xs leading-5 text-ink/70 dark:border-gilt-dark/40 dark:bg-gilt-dark/10 dark:text-ink-dark/70">
                本组有 {practice.fallbackCount || '部分'} 题的 AI 生成结果不完整，已用同级备用题补齐；可以正常练习。
              </p>
            )}
            <div className="fill-blank-prompt mt-7 min-h-32 sm:mt-10 sm:min-h-44">
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
              <p className="fill-blank-translation mt-5 text-sm leading-6 text-ink/55 dark:text-ink-dark/55 sm:text-base">{card.translation}</p>
            </div>

            {settled && (
              <div className="fill-blank-feedback mt-7 border-t border-ink/15 pt-6 dark:border-ink-dark/20">
                <div className={`flex items-start gap-3 border-l-2 px-4 py-3 ${item.status === 'correct' ? 'border-forest dark:border-forest-dark' : 'border-scarlet dark:border-scarlet-dark'}`}>
                  {item.status === 'correct' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-forest dark:text-forest-dark" /> : <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-scarlet dark:text-scarlet-dark" />}
                  <div>
                    <p className="text-sm font-bold text-ink dark:text-ink-dark">{item.status === 'correct' ? (item.attempts ? '纠正成功，记住这个语境。' : '回答正确！') : `答案是 ${card.answer}`}</p>
                    <p className="mt-1 text-xs text-ink/60 dark:text-ink-dark/60">{card.explanation}</p>
                  </div>
                </div>

                <section className="mt-6" aria-labelledby="fill-answer-teaching">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p id="fill-answer-teaching" className="margin-code">答案与用法</p>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
                        <strong className="font-display text-2xl font-semibold text-ink dark:text-ink-dark">{card.answer}</strong>
                        <span className="font-mono text-xs text-ink/40 dark:text-ink-dark/40">{card.phonetic}</span>
                        <span className="text-[10px] font-bold text-forest dark:text-forest-dark">{card.partOfSpeech}</span>
                        <SpeechButton active={props.speech.activeId === `fill:${card.id}:answer`}
                          onClick={() => props.speech.toggle(`fill:${card.id}:answer`, card.answer, card.answer)}
                          label={card.answer} />
                      </div>
                      <p className="mt-1 text-sm text-ink/70 dark:text-ink-dark/70">{card.definition}</p>
                    </div>
                    <span className="border-l-2 border-gilt pl-2 text-[11px] font-semibold text-ink/55 dark:border-gilt-dark dark:text-ink-dark/55">
                      本题考查：{card.focusType === 'grammar' ? '语法形式' : '词义与搭配'}
                    </span>
                  </div>
                  <div className="mt-3">
                    <button type="button" onClick={() => props.onAskWord(card.answer)} className="text-xs font-bold text-forest underline decoration-gilt underline-offset-4 hover:decoration-forest dark:text-forest-dark dark:hover:decoration-forest-dark">问老师</button>
                  </div>
                </section>

                <section className="mt-7 border-t border-ink/15 pt-6 dark:border-ink-dark/20" aria-labelledby="fill-sentence-breakdown">
                  <div className="flex items-center gap-2">
                    <ListTree className="h-4 w-4 text-forest dark:text-forest-dark" />
                    <h3 id="fill-sentence-breakdown" className="text-sm font-bold text-ink dark:text-ink-dark">句子拆解</h3>
                  </div>
                  <div className="mt-4 divide-y divide-ink/10 border-y border-ink/10 dark:divide-ink-dark/15 dark:border-ink-dark/15">
                    {card.breakdown.map((chunk, index) => (
                      <div key={`${chunk.text}-${index}`} className="grid gap-1 py-3 sm:grid-cols-[minmax(8rem,0.9fr)_minmax(7rem,0.7fr)_2fr] sm:gap-4">
                        <div className="flex min-w-0 items-start gap-1">
                          <p className="font-display min-w-0 flex-1 text-sm font-semibold text-ink dark:text-ink-dark">{chunk.text}</p>
                          <SpeechButton active={props.speech.activeId === `fill:${card.id}:chunk:${index}`}
                            onClick={() => props.speech.toggle(`fill:${card.id}:chunk:${index}`, chunk.text, '句子片段')}
                            label="句子片段" />
                        </div>
                        <p className="text-[11px] font-semibold text-forest dark:text-forest-dark">{chunk.role}</p>
                        <p className="text-xs leading-5 text-ink/65 dark:text-ink-dark/65">{chunk.explanation}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-7 border-t border-ink/15 pt-6 dark:border-ink-dark/20" aria-labelledby="fill-imitation-guide">
                  <div className="flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-forest dark:text-forest-dark" />
                    <h3 id="fill-imitation-guide" className="text-sm font-bold text-ink dark:text-ink-dark">仿写</h3>
                  </div>
                  <div className="mt-4 border-l-2 border-gilt pl-4 dark:border-gilt-dark">
                    <p className="text-sm font-bold text-ink dark:text-ink-dark">{card.grammarPoint}</p>
                    <p className="mt-1 text-xs leading-5 text-ink/55 dark:text-ink-dark/55">句型：{card.structure}</p>
                  </div>
                  <ol className="mt-4 space-y-3">
                    {card.imitation.steps.map((step, index) => (
                      <li key={index} className="flex gap-3 text-xs leading-5 text-ink/75 dark:text-ink-dark/75">
                        <span className="margin-code pt-0.5">{String(index + 1).padStart(2, '0')}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  {card.imitation.example && (
                    <div className="mt-5 rounded-md border border-ink/10 bg-paper px-4 py-3 dark:border-ink-dark/15 dark:bg-paper-dark">
                      <p className="margin-code">仿写示例</p>
                      <div className="mt-1.5 flex items-start gap-2">
                        <p className="target-lang min-w-0 flex-1 text-sm text-ink dark:text-ink-dark">{card.imitation.example}</p>
                        <SpeechButton active={props.speech.activeId === `fill:${card.id}:imitation`}
                          onClick={() => props.speech.toggle(`fill:${card.id}:imitation`, card.imitation.example, '仿写例句')}
                          label="仿写例句" />
                      </div>
                      {card.imitation.translation && <p className="mt-1 text-xs text-ink/50 dark:text-ink-dark/50">{card.imitation.translation}</p>}
                    </div>
                  )}
                  {card.imitation.caution && (
                    <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-scarlet dark:text-scarlet-dark">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <p><strong>注意：</strong>{card.imitation.caution}</p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>

        {!settled && (
          <div className="fill-blank-answer-panel max-h-[60%] shrink-0 overflow-y-auto border-t-2 border-ink/70 bg-paper px-5 py-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] dark:border-ink-dark/60 dark:bg-paper-dark sm:px-9">
            <div className="mx-auto max-w-3xl">
              <label htmlFor="fill-answer" className="text-xs font-bold text-ink/75 dark:text-ink-dark/75">填写缺少的单词</label>
              <div className={`mt-2 flex items-center rounded-md border bg-leaf pr-2 transition focus-within:ring-1 dark:bg-leaf-dark ${answerError ? 'border-scarlet focus-within:ring-scarlet/40 dark:border-scarlet-dark dark:focus-within:ring-scarlet-dark/40' : 'border-ink/25 focus-within:border-forest focus-within:ring-forest/40 dark:border-ink-dark/30 dark:focus-within:border-forest-dark dark:focus-within:ring-forest-dark/40'}`}>
                <input ref={inputRef} id="fill-answer" value={item.input} onChange={(event) => { practice.updateInput(event.target.value); setAnswerError(false) }}
                  onKeyDown={(event) => { if (event.key === 'Enter') handleSubmit() }} autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="done"
                  placeholder="输入答案" className="target-lang h-13 min-w-0 flex-1 bg-transparent px-4 text-lg text-ink outline-none placeholder:text-ink/35 dark:text-ink-dark dark:placeholder:text-ink-dark/35" />
                <button type="button" onClick={handleSubmit} disabled={!item.input.trim()}
                  className="h-9 rounded-md bg-forest px-4 text-xs font-bold text-paper transition hover:bg-forest/90 disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-ink/40 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90 dark:disabled:bg-ink-dark/25 dark:disabled:text-ink-dark/40">检查</button>
              </div>
              {answerError && (
                <div role="alert" className="mt-2 flex items-start gap-2 text-xs leading-5 text-scarlet dark:text-scarlet-dark">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> 还差一点。看看提示，再结合中文和句子结构试一次。
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setShowHint((value) => !value)} className="flex items-center gap-2 text-xs font-bold text-gilt hover:text-ink dark:text-gilt-dark dark:hover:text-ink-dark"><Lightbulb className="h-4 w-4" /> {showHint ? '收起提示' : '需要提示'}</button>
                <button type="button" onClick={practice.reveal} className="text-xs font-semibold text-ink/40 hover:text-ink/70 dark:text-ink-dark/40 dark:hover:text-ink-dark/70">查看答案</button>
              </div>
              {showHint && <p className="mt-2 rounded-md border border-gilt/40 bg-gilt/10 px-4 py-2.5 text-sm text-ink/75 dark:border-gilt-dark/40 dark:bg-gilt-dark/10 dark:text-ink-dark/75">{card.hint} · {card.answer.length} 个字母</p>}
            </div>
          </div>
        )}

        {settled && (
          <div className="border-t border-ink/15 bg-paper px-5 py-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] dark:border-ink-dark/20 dark:bg-paper-dark sm:px-9">
            <div className="mx-auto flex max-w-3xl justify-end">
              <button type="button" onClick={practice.next} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-forest px-5 text-sm font-bold text-paper hover:bg-forest/90 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90 sm:w-auto">
                {practice.currentIndex === practice.cards.length - 1 ? '查看本组总结' : '下一题'} {practice.currentIndex === practice.cards.length - 1 ? <BookOpenCheck className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
