// src/components/AnalysisSidebar.tsx
// Merged: AnalysisSidebar + AnalysisTranslationCard + GrammarFeedbackCard + SuggestionListSection + VocabularyCardsSection
import { ArrowLeft, ArrowRight, Lightbulb, TrendingUp, Volume2, BookmarkPlus, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react'
import type { AnalysisHistoryEntry, AnalysisResult, AssistantReplyInsight, GrammarCorrection, WordItem } from '../types'
import { speakText } from '../lib/speech'

// ─── GrammarFeedbackCard ─────────────────────────────────────────────────────

function deriveLearningFocus(correction: GrammarCorrection) {
  const lowerCombined = `${correction.explanation} ${correction.corrected}`.toLowerCase()

  if (lowerCombined.includes('过去式') || lowerCombined.includes('past tense') || lowerCombined.includes('tense')) {
    return { label: '本轮重点：动词时态', rule: '描述昨天、上周等已发生的事时，动词通常需要变成过去式（如 go → went，eat → ate）。' }
  }
  if (lowerCombined.includes('your') || lowerCombined.includes('所有格') || lowerCombined.includes('possessive')) {
    return { label: '本轮重点：your / my 所有格', rule: '放在名词前时用 your / my / his，而不是 you / I / he。' }
  }
  if (lowerCombined.includes('介词') || lowerCombined.includes('preposition')) {
    return { label: '本轮重点：固定搭配', rule: '介词搭配通常需要整块记忆，例如 interested in、good at、arrive at/in。' }
  }
  if (lowerCombined.includes('主谓') || lowerCombined.includes('subject') || lowerCombined.includes('agreement')) {
    return { label: '本轮重点：主谓一致', rule: '第三人称单数主语（he/she/it）后面的动词需要加 -s/-es。' }
  }
  if (lowerCombined.includes('冠词') || lowerCombined.includes('article')) {
    return { label: '本轮重点：冠词用法', rule: '特指用 the，泛指可数单数用 a/an，泛指复数或不可数通常不加冠词。' }
  }
  if (correction.original.trim() === correction.corrected.trim()) {
    return { label: '本轮重点：直接套用高频句', rule: '像 Hi!、Thank you.、What is your name? 这种高频短句，先整句记住，再换其中一个词最容易开口。' }
  }
  return { label: '本轮重点：先模仿再替换', rule: '先把更正句整句读顺，再替换一个时间、地点或人物信息，最容易形成自己的表达。' }
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

function GrammarFeedbackCard({ corrections, onSpeakText, isFallback = false }: {
  corrections: GrammarCorrection[]
  onSpeakText: (text: string) => void
  isFallback?: boolean
}) {
  return (
    <section className="space-y-3 border-b border-zinc-200 pb-5 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
          你的这句先看这里
        </span>
        {isFallback && <span className="text-[10px] text-amber-600 dark:text-amber-400">参考模式</span>}
      </div>

      {corrections.length > 0 ? corrections.map((correction, i) => {
        const focus = deriveLearningFocus(correction)
        const explanation = resolveExplanation(correction, focus)
        const isCorrect = correction.original.trim() === correction.corrected.trim() && correction.score >= 90

        return (
          <div key={i} className="space-y-2">
            <div className={`flex items-center justify-between px-2 py-1 rounded-lg ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-amber-50/60 dark:bg-amber-950/20'}`}>
              <span className={`text-[10px] font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {isCorrect ? '✓ 这句没问题' : `✗ 评分 ${correction.score}/100`}
              </span>
            </div>

            {!isCorrect && (
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 w-12 shrink-0 pt-0.5">原句</span>
                  <p className="text-[12px] text-zinc-600 dark:text-zinc-400 line-through">{correction.original}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-emerald-600 w-12 shrink-0 pt-0.5">更正</span>
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">{correction.corrected}</p>
                    <button onClick={() => onSpeakText(correction.corrected)}
                      className="p-0.5 text-zinc-400 hover:text-indigo-600 transition" title="朗读">
                      <Volume2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {correction.politeForm && correction.politeForm !== correction.corrected && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-indigo-500 w-12 shrink-0 pt-0.5">地道</span>
                    <p className="text-[12px] text-indigo-600 dark:text-indigo-400">{correction.politeForm}</p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 space-y-1">
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{focus.label}</p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">{explanation}</p>
            </div>
          </div>
        )
      }) : (
        <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>这轮表达没有明显语法问题，继续保持！</span>
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
    <div className="space-y-1 border-l-2 border-zinc-200 py-0.5 pl-3 dark:border-zinc-700">
      <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">{content}</p>
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
    <section className="space-y-3 border-b border-zinc-200 pb-5 dark:border-zinc-800">
      <div className="space-y-1">
        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">对照翻译</span>
        <p className="text-[12px] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line pt-1">{translation}</p>
      </div>
      <div className="border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">这句怎么学</span>
          {isFallback && <span className="text-[10px] text-amber-700 dark:text-amber-300">参考说明</span>}
        </div>
        <div className="space-y-2.5">
          <InsightLine label="它这句在干什么" value={insight.structure} />
          <InsightLine label="你可以直接套用哪种说法" value={insight.grammar} />
          <InsightLine label="你下一句最容易往哪里接" value={insight.whyThisReply} />
        </div>
      </div>
    </section>
  )
}

// ─── SuggestionListSection ───────────────────────────────────────────────────

function SuggestionListSection({ suggestions, onSelectSuggestion }: {
  suggestions: string[]
  onSelectSuggestion: (text: string) => void
}) {
  if (suggestions.length === 0) return null

  return (
    <section className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">接下来你可以说</span>
      <ul className="mt-3 space-y-2">
        {suggestions.map((suggestion, i) => {
          const match = suggestion.match(/^(.*?)\s*\[([^\]]+)\]$/)
          const english = match ? match[1].trim() : suggestion
          const chinese = match ? match[2].trim() : ''
          return (
            <li key={i}>
              <button onClick={() => onSelectSuggestion(english)}
                className="w-full text-left rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-stone-50/50 dark:bg-zinc-900/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 px-3 py-2.5 transition group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{english}</p>
                    {chinese && <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-0.5">{chinese}</p>}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-indigo-500 shrink-0 mt-0.5" />
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ─── VocabularyCardsSection ──────────────────────────────────────────────────

function VocabularyCardsSection({ keyWords, isWordSaved, onAddWord, onSpeakText }: {
  keyWords: AnalysisResult['keyWords']
  isWordSaved: (word: string) => boolean
  onAddWord: (word: WordItem) => void
  onSpeakText: (text: string) => void
}) {
  if (keyWords.length === 0) return null

  return (
    <section>
      <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">本轮词汇摘录</span>
      <div className="mt-2">
        {keyWords.filter((kw) => kw.word).map((kw) => {
          const saved = isWordSaved(kw.word)
          return (
            <div key={kw.word} className="border-t border-zinc-200 py-3 first:border-t-0 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">{kw.word}</span>
                  <button onClick={() => onSpeakText(kw.word)}
                    className="p-0.5 text-zinc-400 hover:text-indigo-600 transition" title="朗读">
                    <Volume2 className="h-3 w-3" />
                  </button>
                  {kw.phonetic && <span className="text-[10px] font-mono text-zinc-400">{kw.phonetic}</span>}
                </div>
                <button
                  onClick={() => { if (!saved) onAddWord({ word: kw.word, phonetic: kw.phonetic, translation: kw.definition, exampleEn: kw.exampleEn, exampleZh: kw.exampleZh, addTime: Date.now() }) }}
                  disabled={saved}
                  className={`shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border transition ${saved ? 'border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 cursor-default' : 'border-zinc-200 text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-400 cursor-pointer'}`}
                  title={saved ? '已在词本' : '加入词本'}>
                  <BookmarkPlus className="h-3 w-3" />
                  {saved ? '已收录' : '+词本'}
                </button>
              </div>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold mt-1">{kw.definition}</p>
              {kw.exampleEn && (
                <div className="mt-1.5 text-[10.5px] text-zinc-500 dark:text-zinc-400">
                  <span className="italic">"{kw.exampleEn}"</span>
                  {kw.exampleZh && <span className="block mt-0.5">{kw.exampleZh}</span>}
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
  onAddWord: (word: WordItem) => void
  isWordSaved: (word: string) => boolean
  onSelectSuggestion: (text: string) => void
  onPreviousAnalysis: () => void
  onNextAnalysis: () => void
  onLatestAnalysis: () => void
  onRetryAnalysis: () => void
  embedded?: boolean
}

export default function AnalysisSidebar({
  analysis, analysisHistory, selectedAnalysisIndex, isLoading, onAddWord, isWordSaved,
  onSelectSuggestion, onPreviousAnalysis, onNextAnalysis, onLatestAnalysis, onRetryAnalysis, embedded = false,
}: AnalysisSidebarProps) {
  const handleSpeak = (text: string) => {
    try { speakText({ text, accent: 'us', speed: 0.95, onStart: () => undefined, onEnd: () => undefined }) }
    catch (err) { console.error(err) }
  }

  const hasHistory = analysisHistory.length > 0
  const isViewingLatest = hasHistory && selectedAnalysisIndex === analysisHistory.length - 1
  const currentRound = hasHistory ? selectedAnalysisIndex + 1 : 0

  const shellClass = embedded
    ? 'min-h-0 flex flex-1 flex-col overflow-hidden bg-white dark:bg-zinc-950'
    : 'h-full min-h-0 flex flex-col overflow-hidden border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:border-t-0 lg:border-l'

  return (
    <div className={shellClass}>
      {!embedded && (
        <div className="border-b border-zinc-200 bg-stone-50/60 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/40 sm:px-4 sm:py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Feedback</p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">这句怎么学</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">只保留对开口有帮助的内容：哪里要改、哪句能直接套、下一句怎么接。</p>
        </div>
      )}

      {hasHistory && (
        <div className={`border-b border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-950/90 ${embedded ? 'px-4 py-2.5' : 'px-3 py-2.5 sm:px-4'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-full border border-zinc-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              第 {currentRound} / {analysisHistory.length} 轮{isViewingLatest ? ' · 最新' : ' · 回看中'}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={onRetryAnalysis} disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300"
                title="重新生成本轮分析">
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                重新分析
              </button>
              {!isViewingLatest && (
                <button onClick={onLatestAnalysis}
                  className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
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
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">
                {!iconAfter && <Icon className="h-3.5 w-3.5" />}
                {label}
                {iconAfter && <Icon className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-4 sm:space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200">
              正在生成本轮纠错、词汇摘录与接话建议，请稍候…
            </div>
            <div className="space-y-4 animate-pulse">
              {[
                'h-20 bg-zinc-100 dark:bg-zinc-900 rounded-xl',
                'h-28 bg-zinc-100 dark:bg-zinc-900 rounded-xl',
                'h-32 bg-zinc-100 dark:bg-zinc-900 rounded-xl',
              ].map((cls, i) => (
                <div key={i} className={cls} />
              ))}
            </div>
          </div>
        ) : !analysis ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center text-zinc-400 p-4">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-full mb-3 text-zinc-500">
              <Lightbulb className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">发送第一句后再开始精讲</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
              发送英文消息后，这里会自动展示纠错、翻译和接话建议。
            </p>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {analysis.isFallback && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                当前分析服务暂时不可用，本轮未进行语法评分、纠错、翻译或词汇提取，请稍后继续练习或重试。
              </div>
            )}
            {!analysis.isFallback && (
              <>
                <GrammarFeedbackCard corrections={analysis.grammarCorrections} onSpeakText={handleSpeak} />
                <AnalysisTranslationCard translation={analysis.translation} assistantReplyInsight={analysis.assistantReplyInsight} />
                <SuggestionListSection suggestions={analysis.suggestions} onSelectSuggestion={onSelectSuggestion} />
                <VocabularyCardsSection keyWords={analysis.keyWords} isWordSaved={isWordSaved} onAddWord={onAddWord} onSpeakText={handleSpeak} />
              </>
            )}
          </div>
        )}
      </div>

      {!embedded && (
        <div className="p-3 bg-stone-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 text-center flex items-center justify-center gap-1">
          <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
          <span>每次发送后，AI 会自动更新纠错、翻译与接话建议。</span>
        </div>
      )}
    </div>
  )
}
