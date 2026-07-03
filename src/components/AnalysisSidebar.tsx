import { AnalysisResult, WordItem } from "../types";
import { speakText } from "../features/chat/speech";
import {
  Sparkles, 
  Plus,
  Check,
  Volume2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

interface AnalysisSidebarProps {
  analysis: AnalysisResult | null;
  isLoading: boolean;
  onAddWord: (word: WordItem) => void;
  savedWords: WordItem[];
  onSelectSuggestion: (text: string) => void;
  userMessageEmpty: boolean;
}

export default function AnalysisSidebar({ 
  analysis, 
  isLoading, 
  onAddWord, 
  savedWords, 
  onSelectSuggestion,
  userMessageEmpty
}: AnalysisSidebarProps) {

  // Check if a word is already in the wordbook
  const isWordSaved = (word: string) => {
    return savedWords.some(item => item.word.toLowerCase() === word.toLowerCase());
  };

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

  // Convert raw recommendation string to clean clickable structure
  // E.g. "I love cats! [我喜欢猫！]" -> text: "I love cats!" and label: "我喜欢猫！"
  const parseSuggestion = (str: string) => {
    const regex = /^(.*?)\s*\[(.*?)\]$/;
    const match = str.match(regex);
    if (match) {
      return { english: match[1].trim(), chinese: match[2].trim() };
    }
    return { english: str, chinese: "" };
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/40 flex items-center gap-2">
        <Sparkles className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          实时翻译与语法纠错 (Feedback)
        </h3>
      </div>

      {/* Main Content scroll window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {isLoading ? (
          /* SKELETON LOADING LOOPS */
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-zinc-100 dark:bg-zinc-900 rounded-xl"></div>
            <div className="h-28 bg-zinc-100 dark:bg-zinc-900 rounded-xl"></div>
            <div className="h-32 bg-zinc-100 dark:bg-zinc-900 rounded-xl"></div>
          </div>
        ) : !analysis ? (
          /* NO CONVERSATION YET */
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
          /* RENDER REAL LINGUISTIC REPORT */
          <div className="space-y-5 animate-fade-in">
            
            {/* SECTION 1: Dual-translation */}
            <div className="bg-stone-50/70 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono">
                  对照翻译 Translation
                </span>
                <span className="text-[10px] text-zinc-400">
                  自动捕捉
                </span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                {analysis.translation || "暂无翻译数据。"}
              </p>
            </div>

            {/* SECTION 2: Grammar Correction & Score */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono">
                  句法纠错 Grammar Check
                </span>
                
                {/* Grammar Score status */}
                {analysis.grammarCorrections && analysis.grammarCorrections.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500">语法得分:</span>
                    <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                      analysis.grammarCorrections[0].score >= 90 
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" 
                        : analysis.grammarCorrections[0].score >= 70
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                        : "bg-rose-50 text-rose-600"
                    }`}>
                      {analysis.grammarCorrections[0].score}分
                    </span>
                  </div>
                ) : (
                  <span className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/10 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-3.5 w-3.5" /> Perfect!
                  </span>
                )}
              </div>

              {analysis.grammarCorrections && analysis.grammarCorrections.length > 0 ? (
                analysis.grammarCorrections.map((corr, idx) => (
                  <div key={idx} className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-500 font-mono block">您的输入 Original:</span>
                      <p className="line-through text-zinc-500 mt-0.5 font-mono bg-rose-50/20 dark:bg-rose-950/10 p-1.5 rounded border border-rose-50 dark:border-rose-950/20">
                        {corr.original}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 font-mono block flex items-center gap-1">
                        标准更正 Corrected:
                        <button 
                          onClick={() => handleSpeakText(corr.corrected)}
                          className="p-0.5 text-zinc-400 hover:text-indigo-600 rounded"
                          title="听正确句子发发音"
                        >
                          <Volume2 className="h-3 w-3" />
                        </button>
                      </span>
                      <p className="text-zinc-900 dark:text-zinc-100 font-semibold font-mono mt-0.5 bg-emerald-50/20 dark:bg-emerald-950/15 p-1.5 rounded border border-emerald-50 dark:border-emerald-950/20">
                        {corr.corrected}
                      </p>
                    </div>

                    {corr.politeForm && (
                      <div>
                        <span className="text-[10px] font-bold text-indigo-500 block">地道表达 Native/Polite:</span>
                        <p className="text-zinc-700 dark:text-zinc-300 italic mt-0.5">
                          ⭐ {corr.politeForm}
                        </p>
                      </div>
                    )}

                    <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-dashed border-amber-200 dark:border-zinc-800 rounded-lg p-2.5 text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                      <span className="font-semibold text-amber-700 dark:text-amber-500 flex items-center gap-1 mb-0.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        中文注释与原因
                      </span>
                      {corr.explanation}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs font-semibold text-emerald-600">语法非常完美，完美句式！</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">暂无需要纠错的语病。继续保持口语输出哦！</p>
                </div>
              )}
            </div>

            {/* SECTION 3: Key words dictionary lists */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono block w-max">
                本轮生词析卡 Vocabulary Cards
              </span>

              {analysis.keyWords && analysis.keyWords.length > 0 ? (
                <div className="space-y-4">
                  {analysis.keyWords.map((item, idx) => {
                    const saved = isWordSaved(item.word);
                    return (
                      <div 
                        key={idx} 
                        className="p-3 bg-stone-50/40 dark:bg-zinc-950/30 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-1.5 transition-all relative group"
                      >
                        {/* Wordbook Action */}
                        <button
                          onClick={() => onAddWord({
                            word: item.word,
                            phonetic: item.phonetic,
                            translation: item.definition,
                            exampleEn: item.exampleEn,
                            exampleZh: item.exampleZh,
                            addTime: Date.now()
                          })}
                          className={`absolute top-2 right-2 p-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                            saved 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900" 
                              : "bg-white text-indigo-600 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-50 hover:border-indigo-300"
                          }`}
                        >
                          {saved ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>已收集</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              <span>+加词本</span>
                            </>
                          )}
                        </button>

                        <div className="pr-16">
                          <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                            {item.word}
                            <button 
                              onClick={() => handleSpeakText(item.word)}
                              className="p-0.5 text-zinc-400 hover:text-indigo-600 rounded"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                            </button>
                          </h4>
                          <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                            {item.phonetic}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                          {item.definition}
                        </p>

                        <div className="bg-white dark:bg-zinc-900/60 p-2 rounded border border-zinc-100 dark:border-zinc-800 text-[10.5px]">
                          <p className="text-[10px] text-zinc-400 font-semibold italic">Example (双语例句):</p>
                          <p className="text-zinc-700 dark:text-zinc-300 mt-0.5 italic text-[11px] leading-tight font-medium">
                            “ {item.exampleEn} ”
                          </p>
                          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                            {item.exampleZh}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-2">
                  本回合暂无重点抽取的新单词。
                </p>
              )}
            </div>

            {/* SECTION 4: Smart Conversational Suggestions */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-3">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase font-mono block w-max">
                智能接话建议 Speech Suggestions
              </span>
              <p className="text-[11.5px] text-zinc-500 leading-normal">
                不知道怎么接话？点击下方契合当前难度的地道回答，可直接填充至左侧对话框：
              </p>

              <div className="space-y-2">
                {analysis.suggestions && analysis.suggestions.length > 0 ? (
                  analysis.suggestions.map((sug, idx) => {
                    const parsed = parseSuggestion(sug);
                    return (
                      <button
                        key={idx}
                        onClick={() => onSelectSuggestion(parsed.english)}
                        className="w-full text-left p-2.5 bg-indigo-50/10 dark:bg-indigo-950/10 border border-dashed border-indigo-200 dark:border-indigo-900/40 rounded-xl hover:border-indigo-500/80 hover:bg-indigo-50/35 dark:hover:bg-indigo-950/20 cursor-pointer transition text-xs scale-hover flex gap-1.5 items-start font-sans"
                      >
                        <ArrowRight className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                            {parsed.english}
                          </p>
                          {parsed.chinese && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {parsed.chinese}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-400 italic">暂无建议</p>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 bg-stone-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 text-center flex items-center justify-center gap-1">
        <TrendingUp className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
        <span>每次消息发送，AI 实时进行句型诊断，帮您积累生词本。</span>
      </div>
    </div>
  );
}
