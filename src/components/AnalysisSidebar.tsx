// src/components/AnalysisSidebar.tsx
// Merged: AnalysisSidebar + AnalysisTranslationCard + GrammarFeedbackCard + SuggestionListSection + VocabularyCardsSection
// 版式：教师的旁批页。每轮分析标 §N 小节码，原句/更正/地道三行对照，
// 朱色留给真正的错误，其余皆墨色。
import { ArrowLeft, ArrowRight, Lightbulb, CheckCircle2, ChevronRight, RefreshCw } from './Icon'
import type { AnalysisHistoryEntry, AnalysisResult, AssistantReplyInsight, GrammarCorrection } from '../types'
import type { SpeechPlayer } from '../lib/speech'
import SpeechButton from './SpeechButton'

// ─── GrammarFeedbackCard ─────────────────────────────────────────────────────

function deriveLearningFocus(correction: GrammarCorrection) {
  const lowerCombined = `${correction.explanation} ${correction.corrected}`.toLowerCase()

  if (lowerCombined.includes('过去式') || lowerCombined.includes('past tense') || lowerCombined.includes('tense')) {
    return { label: '重点：动词时态', rule: '描述昨天、上周等已发生的事时，动词通常需要变成过去式（如 go → went，eat → ate）。' }
  }
  if (lowerCombined.includes('your') || lowerCombined.includes('所有格') || lowerCombined.includes('possessive')) {
    return { label: '重点：your / my 所有格', rule: '放在名词前时用 your / my / his，而不是 you / I / he。' }
  }
  if (lowerCombined.includes('介词') || lowerCombined.includes('preposition')) {
    return { label: '重点：固定搭配', rule: '介词搭配通常需要整块记忆，例如 interested in、good at、arrive at/in。' }
  }
  if (lowerCombined.includes('主谓') || lowerCombined.includes('subject') || lowerCombined.includes('agreement')) {
    return { label: '重点：主谓一致', rule: '第三人称单数主语（he/she/it）后面的动词需要加 -s/-es。' }
  }
  if (lowerCombined.includes('冠词') || lowerCombined.includes('article')) {
    return { label: '重点：冠词用法', rule: '特指用 the，泛指可数单数用 a/an，泛指复数或不可数通常不加冠词。' }
  }
  if (correction.original.trim() === correction.corrected.trim()) {
    return { label: '重点：高频整句', rule: '像 Hi!、Thank you.、What is your name? 这种高频短句，先整句记住，再换其中一个词最容易开口。' }
  }
  return { label: '重点：模仿与替换', rule: '先把更正句整句读顺，再替换一个时间、地点或人物信息，最容易形成自己的表达。' }
}

function containsChinese(text: string) { return /[一-鿿]/.test(text) }

function resolveExplanation(correction: GrammarCorrection, focus: ReturnType<typeof deriveLearningFocus>) {
  const explanation = correction.explanation.trim()
  if (explanation && explanation !== 'No specific issues found.' && containsChinese(explanation)) return explanation
  if (correction.original.trim() === correction.corrected.trim()) {
    return '这句话本身已经可以直接使用，更值得做的是把它当成高频整句记住，再替换其中一个词继续练。'
  }
  if (focus.label.includes('your / my')) return `这句更适合直接记成"${correction.corrected}"。${focus.rule}`
  return `优先记住这条规则：${focus.rule}`
}

function GrammarFeedbackCard({ corrections, speech, speechScope, isFallback = false }: {
  corrections: GrammarCorrection[]
  speech: SpeechPlayer
  speechScope: string
  isFallback?: boolean
}) {
  return (
    <section className="space-y-3 border-b border-ink/10 pb-5 dark:border-ink-dark/15">
      <div className="flex items-center justify-between">
        <span className="margin-code">旁批 · 表达反馈</span>
        {isFallback && <span className="text-[10px] text-scarlet dark:text-scarlet-dark">参考模式</span>}
      </div>

      {corrections.length > 0 ? corrections.map((correction, i) => {
        const focus = deriveLearningFocus(correction)
        const explanation = resolveExplanation(correction, focus)
        const isCorrect = correction.original.trim() === correction.corrected.trim() && correction.score >= 90
        const correctedSpeechId = `${speechScope}:correction:${i}:corrected`
        const politeSpeechId = `${speechScope}:correction:${i}:polite`

        return (
          <div key={i} className="space-y-2">
            <div className={`flex items-center justify-between border-l-2 py-0.5 pl-2.5 pr-1 ${isCorrect ? 'border-forest dark:border-forest-dark' : 'border-scarlet dark:border-scarlet-dark'}`}>
              <span className={`text-[10px] font-bold ${isCorrect ? 'text-forest dark:text-forest-dark' : 'text-scarlet dark:text-scarlet-dark'}`}>
                {isCorrect ? '✓ 这句没问题' : `✗ 评分 ${correction.score}/100`}
              </span>
              {isCorrect && <SpeechButton active={speech.activeId === correctedSpeechId}
                onClick={() => speech.toggle(correctedSpeechId, correction.corrected, '你的句子')}
                label="你的句子" />}
            </div>

            {!isCorrect && (
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="w-10 shrink-0 pt-0.5 text-[10px] font-bold text-ink/40 dark:text-ink-dark/40">原句</span>
                  <p className="target-lang text-[13px] text-ink/50 line-through decoration-scarlet/60 dark:text-ink-dark/50 dark:decoration-scarlet-dark/60">{correction.original}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-10 shrink-0 pt-0.5 text-[10px] font-bold text-scarlet dark:text-scarlet-dark">更正</span>
                  <div className="flex items-center gap-2">
                    <p className="target-lang text-[13px] font-semibold text-ink dark:text-ink-dark">{correction.corrected}</p>
                    <SpeechButton active={speech.activeId === correctedSpeechId}
                      onClick={() => speech.toggle(correctedSpeechId, correction.corrected, '更正句')}
                      label="更正句" />
                  </div>
                </div>
                {correction.politeForm && correction.politeForm !== correction.corrected && (
                  <div className="flex items-start gap-2">
                    <span className="w-10 shrink-0 pt-0.5 text-[10px] font-bold text-forest dark:text-forest-dark">地道</span>
                    <div className="flex items-center gap-2">
                      <p className="target-lang text-[13px] text-forest dark:text-forest-dark">{correction.politeForm}</p>
                      <SpeechButton active={speech.activeId === politeSpeechId}
                        onClick={() => speech.toggle(politeSpeechId, correction.politeForm ?? '', '地道表达')}
                        label="地道表达" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1 border-l border-ink/15 pl-3 dark:border-ink-dark/20">
              <p className="text-[10px] font-bold text-forest dark:text-forest-dark">{focus.label}</p>
              <p className="text-[11px] leading-relaxed text-ink/65 dark:text-ink-dark/65">{explanation}</p>
            </div>
          </div>
        )
      }) : (
        <div className="flex items-center gap-2 border-l-2 border-forest py-0.5 pl-2.5 text-[11px] text-forest dark:border-forest-dark dark:text-forest-dark">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>未发现明显语法问题。</span>
        </div>
      )}
    </section>
  )
}

// ─── AnalysisTranslationCard ─────────────────────────────────────────────────

const DEFAULT_INSIGHT: AssistantReplyInsight = {
  structure: '它先顺着当前话题往下接，并给了你一条最容易继续说下去的路。',
  grammar: '优先模仿这一轮里最容易直接复用的问句或回答，不必每次都硬找复杂语法点。',
  whyThisReply: '先看懂它下一步想聊什么，再直接借用里面的句型接话。',
}

function InsightLine({ label, value }: { label: string; value: string }) {
  const content = value.trim() || '本轮暂无可直接复用的提示。'
  return (
    <div className="space-y-1 border-l border-ink/15 py-0.5 pl-3 dark:border-ink-dark/20">
      <p className="margin-code">{label}</p>
      <p className="text-[11px] leading-relaxed text-ink/70 dark:text-ink-dark/70">{content}</p>
    </div>
  )
}

function AnalysisTranslationCard({ translation, assistantReplyInsight, isFallback = false }: {
  translation: string
  assistantReplyInsight?: AssistantReplyInsight
  isFallback?: boolean
}) {
  const insight = assistantReplyInsight ?? DEFAULT_INSIGHT
  return (
    <section className="space-y-3 border-b border-ink/10 pb-5 dark:border-ink-dark/15">
      <div className="space-y-1">
        <span className="margin-code">对照翻译</span>
        <p className="whitespace-pre-line pt-1 text-[12px] leading-relaxed text-ink/75 dark:text-ink-dark/75">{translation}</p>
      </div>
      <div className="border-t border-ink/10 pt-3 dark:border-ink-dark/15">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="margin-code">这句怎么学</span>
          {isFallback && <span className="text-[10px] text-scarlet dark:text-scarlet-dark">参考说明</span>}
        </div>
        <div className="space-y-2.5">
          <InsightLine label="作用" value={insight.structure} />
          <InsightLine label="可套用表达" value={insight.grammar} />
          <InsightLine label="接话方向" value={insight.whyThisReply} />
        </div>
      </div>
    </section>
  )
}

// ─── SuggestionListSection ───────────────────────────────────────────────────

function SuggestionListSection({ suggestions, onSelectSuggestion, speech, speechScope }: {
  suggestions: string[]
  onSelectSuggestion: (text: string) => void
  speech: SpeechPlayer
  speechScope: string
}) {
  if (suggestions.length === 0) return null

  return (
    <section className="border-b border-ink/10 pb-5 dark:border-ink-dark/15">
      <span className="margin-code">接话建议</span>
      <ul className="mt-3 space-y-2">
        {suggestions.map((suggestion, i) => {
          const match = suggestion.match(/^(.*?)\s*\[([^\]]+)\]$/)
          const english = match ? match[1].trim() : suggestion
          const chinese = match ? match[2].trim() : ''
          const speechId = `${speechScope}:suggestion:${i}`
          return (
            <li key={i} className="group/sug flex items-stretch rounded-md border border-ink/15 bg-leaf transition hover:border-forest dark:border-ink-dark/20 dark:bg-leaf-dark dark:hover:border-forest-dark">
              <span aria-hidden="true" className={`w-0.5 shrink-0 self-stretch rounded-l-md transition ${'bg-transparent group-hover/sug:bg-forest dark:group-hover/sug:bg-forest-dark'}`} />
              <button onClick={() => onSelectSuggestion(english)} className="group min-w-0 flex-1 px-3 py-2.5 text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="target-lang text-[13px] text-ink group-hover:text-forest dark:text-ink-dark dark:group-hover:text-forest-dark">{english}</p>
                    {chinese && <p className="mt-0.5 text-[10.5px] text-ink/50 dark:text-ink-dark/50">{chinese}</p>}
                  </div>
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/30 group-hover:text-forest dark:text-ink-dark/30 dark:group-hover:text-forest-dark" />
                </div>
              </button>
              <SpeechButton active={speech.activeId === speechId}
                onClick={() => speech.toggle(speechId, english, '接话建议')}
                label="接话建议" />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ─── VocabularyCardsSection ──────────────────────────────────────────────────

function VocabularyCardsSection({ keyWords, speech, speechScope }: {
  keyWords: AnalysisResult['keyWords']
  speech: SpeechPlayer
  speechScope: string
}) {
  if (keyWords.length === 0) return null

  return (
    <section>
      <span className="margin-code">生词</span>
      <div className="mt-2">
        {keyWords.filter((kw) => kw.word).map((kw, index) => {
          const wordSpeechId = `${speechScope}:word:${index}`
          const exampleSpeechId = `${speechScope}:word:${index}:example`
          return (
            <div key={kw.word} className="border-t border-ink/10 py-3 first:border-t-0 dark:border-ink-dark/15">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[17px] font-semibold text-ink dark:text-ink-dark">{kw.word}</span>
                <SpeechButton active={speech.activeId === wordSpeechId}
                  onClick={() => speech.toggle(wordSpeechId, kw.word, kw.word)} label={kw.word} />
                {kw.phonetic && <span className="font-mono text-[10px] text-ink/40 dark:text-ink-dark/40">{kw.phonetic}</span>}
              </div>
              <p className="mt-1 text-[11px] font-semibold text-ink/70 dark:text-ink-dark/70">{kw.definition}</p>
              {kw.exampleEn && (
                <div className="mt-1.5 flex items-start gap-1 text-[11px] text-ink/55 dark:text-ink-dark/55">
                  <div className="min-w-0 flex-1 border-l border-ink/15 pl-2.5 dark:border-ink-dark/20">
                    <span className="target-lang">“{kw.exampleEn}”</span>
                    {kw.exampleZh && <span className="mt-0.5 block">{kw.exampleZh}</span>}
                  </div>
                  <SpeechButton active={speech.activeId === exampleSpeechId}
                    onClick={() => speech.toggle(exampleSpeechId, kw.exampleEn, '词汇例句')}
                    label="词汇例句" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── AnalysisSidebar (main export) ───────────────────────────────────────────

interface AnalysisSidebarProps {
  analysis: AnalysisResult | null
  analysisHistory: AnalysisHistoryEntry[]
  selectedAnalysisIndex: number
  isLoading: boolean
  onSelectSuggestion: (text: string) => void
  onPreviousAnalysis: () => void
  onNextAnalysis: () => void
  onLatestAnalysis: () => void
  onRetryAnalysis: () => void
  speech: SpeechPlayer
  embedded?: boolean
}

export default function AnalysisSidebar({
  analysis, analysisHistory, selectedAnalysisIndex, isLoading,
  onSelectSuggestion, onPreviousAnalysis, onNextAnalysis, onLatestAnalysis, onRetryAnalysis, speech, embedded = false,
}: AnalysisSidebarProps) {
  const hasHistory = analysisHistory.length > 0
  const isViewingLatest = hasHistory && selectedAnalysisIndex === analysisHistory.length - 1
  const currentRound = hasHistory ? selectedAnalysisIndex + 1 : 0
  const speechScope = `analysis:${analysisHistory[selectedAnalysisIndex]?.id ?? selectedAnalysisIndex}`

  const shellClass = embedded
    ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-paper dark:bg-paper-dark'
    : 'flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-ink/20 bg-paper dark:border-ink-dark/25 dark:bg-paper-dark'

  return (
    <div className={shellClass}>
      {!embedded && (
        <div className="flex items-baseline justify-between border-b border-ink/15 px-3 py-3 dark:border-ink-dark/20 sm:px-4">
          <h3 className="font-display text-sm font-semibold text-ink dark:text-ink-dark">学习反馈</h3>
          <span className="margin-code">旁批</span>
        </div>
      )}

      {hasHistory && (
        <div className={`border-b border-ink/15 dark:border-ink-dark/20 ${embedded ? 'px-4 py-2.5' : 'px-3 py-2.5 sm:px-4'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-md border border-ink/15 px-2.5 py-1 text-[11px] font-medium text-ink/55 dark:border-ink-dark/20 dark:text-ink-dark/55">
              第 {currentRound} / {analysisHistory.length} 轮{isViewingLatest ? ' · 最新' : ' · 回看中'}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={onRetryAnalysis} disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-md border border-ink/15 px-2.5 py-1 text-[11px] font-medium text-ink/60 transition hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-dark/20 dark:text-ink-dark/60 dark:hover:border-forest-dark dark:hover:text-forest-dark"
                title="重新生成本轮分析">
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                重新分析
              </button>
              {!isViewingLatest && (
                <button onClick={onLatestAnalysis}
                  className="rounded-md bg-forest px-2.5 py-1 text-[11px] font-medium text-paper transition hover:bg-forest/90 dark:bg-forest-dark dark:text-paper-dark dark:hover:bg-forest-dark/90">
                  回到最新
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {[
              { label: '上一轮', icon: ArrowLeft, action: onPreviousAnalysis, disabled: selectedAnalysisIndex === 0 },
              { label: '下一轮', icon: ArrowRight, action: onNextAnalysis, disabled: selectedAnalysisIndex >= analysisHistory.length - 1, iconAfter: true },
            ].map(({ label, icon: Icon, action, disabled, iconAfter }) => (
              <button key={label} onClick={action} disabled={disabled}
                className="inline-flex items-center gap-1 rounded-md border border-ink/15 px-2.5 py-1 text-[11px] font-medium text-ink/60 transition hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-dark/20 dark:text-ink-dark/60 dark:hover:border-ink-dark/50">
                {!iconAfter && <Icon className="h-3.5 w-3.5" />}
                {label}
                {iconAfter && <Icon className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:space-y-5 sm:p-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="rounded-md border border-forest/30 bg-forest/5 px-3 py-2.5 text-[11px] leading-relaxed text-forest dark:border-forest-dark/40 dark:bg-forest-dark/10 dark:text-forest-dark">
              正在分析…
            </div>
            <div className="animate-pulse space-y-4">
              {[
                'h-20 bg-ink/5 dark:bg-ink-dark/10 rounded-md',
                'h-28 bg-ink/5 dark:bg-ink-dark/10 rounded-md',
                'h-32 bg-ink/5 dark:bg-ink-dark/10 rounded-md',
              ].map((cls, i) => (
                <div key={i} className={cls} />
              ))}
            </div>
          </div>
        ) : !analysis ? (
          <div className="flex h-[60vh] flex-col items-center justify-center p-4 text-center">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-full border border-ink/15 text-ink/35 dark:border-ink-dark/20 dark:text-ink-dark/35">
              <Lightbulb className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-ink/60 dark:text-ink-dark/60">发送英文后查看反馈</p>
          </div>
        ) : (
          <div className="animate-fade-in space-y-5">
            {analysis.isFallback && (
              <div className="rounded-md border border-scarlet/30 bg-scarlet/5 px-3 py-2.5 text-[11px] leading-relaxed text-scarlet dark:border-scarlet-dark/40 dark:bg-scarlet-dark/10 dark:text-scarlet-dark">
                当前分析服务暂时不可用，本轮未进行语法评分、纠错、翻译或词汇提取，请稍后继续练习或重试。
              </div>
            )}
            {!analysis.isFallback && (
              <>
                <GrammarFeedbackCard corrections={analysis.grammarCorrections} speech={speech} speechScope={speechScope} />
                <AnalysisTranslationCard translation={analysis.translation} assistantReplyInsight={analysis.assistantReplyInsight} />
                <SuggestionListSection suggestions={analysis.suggestions} onSelectSuggestion={onSelectSuggestion} speech={speech} speechScope={speechScope} />
                <VocabularyCardsSection keyWords={analysis.keyWords} speech={speech} speechScope={speechScope} />
              </>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
