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
}

export default function AnalysisSidebar({
  analysis,
  isLoading,
  onAddWord,
  isWordSaved,
  onSelectSuggestion,
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

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/40 flex items-center gap-2">
        <Sparkles className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          实时翻译与语法纠错 (Feedback)
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-5">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-zinc-100 dark:bg-zinc-900 rounded-xl"></div>
            <div className="h-28 bg-zinc-100 dark:bg-zinc-900 rounded-xl"></div>
            <div className="h-32 bg-zinc-100 dark:bg-zinc-900 rounded-xl"></div>
          </div>
        ) : !analysis ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center text-zinc-400 p-4">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-full mb-3 text-zinc-500">
              <Lightbulb className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">暂无实时诊断数据</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
              在左侧窗口中输入消息或发送语音，AI 会在此右侧面板自动拆解您的语法，提供双语对照、地道口语推荐和单词析卡。
            </p>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            <AnalysisTranslationCard translation={analysis.translation} />
            <GrammarFeedbackCard corrections={analysis.grammarCorrections} onSpeakText={handleSpeakText} />
            <VocabularyCardsSection
              keyWords={analysis.keyWords}
              isWordSaved={isWordSaved}
              onAddWord={onAddWord}
              onSpeakText={handleSpeakText}
            />
            <SuggestionListSection
              suggestions={analysis.suggestions}
              onSelectSuggestion={onSelectSuggestion}
            />
          </div>
        )}
      </div>

      <div className="p-3 bg-stone-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 text-center flex items-center justify-center gap-1">
        <TrendingUp className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
        <span>每次消息发送，AI 实时进行句型诊断，帮您积累生词本。</span>
      </div>
    </div>
  );
}
