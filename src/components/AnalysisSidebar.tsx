import { Sparkles, Lightbulb, TrendingUp } from "lucide-react";
import type { AnalysisResult, WordItem } from "../types";
import { speakText } from "../features/chat/speech";
import { AnalysisTranslationCard } from "../features/analysis/AnalysisTranslationCard";
import { GrammarFeedbackCard } from "../features/analysis/GrammarFeedbackCard";
import { VocabularyCardsSection } from "../features/analysis/VocabularyCardsSection";
import { SuggestionListSection } from "../features/analysis/SuggestionListSection";

interface AnalysisSidebarProps {
  analysis: AnalysisResult | null;
  isLoading: boolean;
  onAddWord: (word: WordItem) => boolean;
  isWordSaved: (word: string) => boolean;
  onSelectSuggestion: (text: string) => void;
  embedded?: boolean;
}

export default function AnalysisSidebar({
  analysis,
  isLoading,
  onAddWord,
  isWordSaved,
  onSelectSuggestion,
  embedded = false,
}: AnalysisSidebarProps) {
  const handleSpeakText = (text: string) => {
    try {
      speakText({
        text,
        accent: "us",
        speed: 0.95,
        onStart: () => undefined,
        onEnd: () => undefined,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const shellClassName = embedded
    ? "min-h-0 flex flex-1 flex-col overflow-hidden bg-white dark:bg-zinc-950"
    : "h-full min-h-0 flex flex-col overflow-hidden border-t border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:border-t-0 lg:border-l"

  return (
    <div className={shellClassName}>
      {!embedded && (
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/40 flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            实时翻译与语法纠错 (Feedback)
          </h3>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-4 sm:space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200">
              正在生成本轮纠错、词汇摘录与接话建议。真实模型在空闲时通常几秒内返回；若当前免费线路较忙，可能需要稍等片刻。等待期间不影响您继续聊天。
            </div>
            <div className="space-y-4 animate-pulse">
              <div className="h-20 bg-zinc-100 dark:bg-zinc-900 rounded-xl"></div>
              <div className="h-28 bg-zinc-100 dark:bg-zinc-900 rounded-xl"></div>
              <div className="h-32 bg-zinc-100 dark:bg-zinc-900 rounded-xl"></div>
            </div>
          </div>
        ) : !analysis ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center text-zinc-400 p-4">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-full mb-3 text-zinc-500">
              <Lightbulb className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">发送第一句后再开始精讲</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
              当您发送英文消息或语音后，这里会自动展示纠错、对照翻译和接话建议；词汇摘录仅作为补充参考。
            </p>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {analysis.isFallback && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                当前 AI 服务繁忙，已切换到备用分析模式。您仍可继续练习，但本轮评分、词汇和接话建议会更偏保守参考，不等同于逐句精批。
              </div>
            )}
            <GrammarFeedbackCard
              corrections={analysis.grammarCorrections}
              onSpeakText={handleSpeakText}
              isFallback={analysis.isFallback === true}
            />
            <AnalysisTranslationCard
              translation={analysis.translation}
              assistantReplyInsight={analysis.assistantReplyInsight}
              isFallback={analysis.isFallback === true}
            />
            <SuggestionListSection
              suggestions={analysis.suggestions}
              onSelectSuggestion={onSelectSuggestion}
            />
            <VocabularyCardsSection
              keyWords={analysis.keyWords}
              isWordSaved={isWordSaved}
              onAddWord={onAddWord}
              onSpeakText={handleSpeakText}
            />
          </div>
        )}
      </div>

      {!embedded && (
        <div className="p-3 bg-stone-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 text-center flex items-center justify-center gap-1">
          <TrendingUp className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
          <span>每次消息发送，AI 会补充纠错、翻译与接话建议。</span>
        </div>
      )}
    </div>
  );
}
