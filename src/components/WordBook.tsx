import React, { useState, useEffect } from "react";
import { WordItem } from "../types";
import { speakText } from "../features/chat/speech";
import {
  BookMarked, 
  Trash2, 
  Volume2, 
  Sparkles, 
  ArrowLeftRight, 
  Layers, 
  HelpCircle,
  TrendingUp,
  X,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";

interface WordBookProps {
  isOpen: boolean;
  onClose: () => void;
  wordList: WordItem[];
  onRemoveWord: (word: string) => void;
  onClearAll: () => void;
}

export default function WordBook({ isOpen, onClose, wordList, onRemoveWord, onClearAll }: WordBookProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'flashcard'>('list');
  const [flashCardIndex, setFlashCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Play pronunciation via browser local Speech Synthesis
  const handleSpeakWord = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      speakText({
        text: word,
        accent: "us",
        speed: 0.9,
        onStart: () => undefined,
        onEnd: () => undefined,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setFlashCardIndex((prev) => (prev + 1) % wordList.length);
    }, 150);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setFlashCardIndex((prev) => (prev - 1 + wordList.length) % wordList.length);
    }, 150);
  };

  useEffect(() => {
    // Reset index when changing modes
    setFlashCardIndex(0);
    setIsFlipped(false);
  }, [activeTab]);

  useEffect(() => {
    // Removing a card can make the current flashcard index point past the end.
    // Clamp it immediately so the drill never renders an empty card on mobile.
    setFlashCardIndex((index) => Math.min(index, Math.max(0, wordList.length - 1)));
  }, [wordList.length]);

  if (!isOpen) return null;

  const safeFlashCardIndex = wordList.length > 0
    ? Math.min(flashCardIndex, wordList.length - 1)
    : 0;
  const activeFlashCard = wordList[safeFlashCardIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-950 rounded-t-3xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[92dvh] sm:h-[85vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 bg-stone-50/80 dark:bg-zinc-900/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
              <BookMarked className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                我的英文生词本 (My Vocabulary Notebook)
              </h2>
              <p className="hidden text-xs text-zinc-500 sm:block">
                收录了您在聊天或语法分析时一键加星的词汇，为您量身制作学习卡。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 transition"
            aria-label="关闭生词本"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector bar */}
        <div className="px-4 sm:px-6 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'list'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              生词清单 ({wordList.length}词)
            </button>
            <button
              onClick={() => setActiveTab('flashcard')}
              disabled={wordList.length === 0}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                wordList.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : activeTab === 'flashcard'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <Layers className="h-4 w-4" />
              記憶抽卡 (Flashcard Drill)
            </button>
          </div>

          {wordList.length > 0 && activeTab === 'list' && (
            <button
              onClick={onClearAll}
              className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              清空全部生词
            </button>
          )}
        </div>

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-50/30 dark:bg-zinc-950/20">
          {wordList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
              <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 mb-4 border border-dashed border-zinc-300">
                <BookMarked className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">还没有收录任何生词哦</h3>
              <p className="text-xs text-zinc-500 mt-2">
                在右侧的【实时语法翻译面板】点击生词旁的加星 “+加词本” 按钮，可以直接将查到的难词与拼写错误收集到这里复习。
              </p>
            </div>
          ) : activeTab === 'list' ? (
            /* LIST VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wordList.map((item) => (
                <div 
                  key={item.word}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition group"
                >
                  <div className="flex justify-between items-start gap-1">
                    <div>
                      <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {item.word}
                        <button 
                          onClick={(e) => handleSpeakWord(item.word, e)}
                          className="p-1 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition cursor-pointer"
                          title="听发音"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </h4>
                      <span className="text-xs font-mono text-zinc-400 block mt-0.5">
                        {item.phonetic}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemoveWord(item.word)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer"
                      title="移出生词本"
                      aria-label={`移出生词本：${item.word}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mt-2 bg-indigo-50/40 dark:bg-indigo-950/20 px-2 py-1 rounded inline-block">
                    {item.translation}
                  </p>

                  <div className="mt-3 text-xs border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
                    <p className="font-medium text-zinc-700 dark:text-zinc-300 italic">
                      “ {item.exampleEn} ”
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                      {item.exampleZh}
                    </p>
                  </div>
                  
                  <div className="text-[9px] text-zinc-400 mt-3 flex justify-between items-center bg-stone-50 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    <span>Added inside Chat</span>
                    <span>{new Date(item.addTime).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* FLASHCARD DECK VIEW */
            <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto">
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className={`w-full aspect-[1.6/1] bg-white dark:bg-zinc-900 border-2 ${
                  isFlipped ? "border-indigo-500 bg-indigo-50/5 dark:bg-zinc-[900]" : "border-zinc-200 dark:border-zinc-800"
                } rounded-2xl p-6 shadow-md cursor-pointer flex flex-col items-center justify-center relative hover:shadow-lg transition-all duration-300 transform select-none`}
              >
                {/* Micro instructions */}
                <div className="absolute top-3 left-4 flex items-center gap-1.5 text-[10px] text-zinc-400">
                  <Layers className="h-3 w-3" />
                  <span>Card {safeFlashCardIndex + 1} of {wordList.length}</span>
                </div>
                
                <div className="absolute top-3 right-4 flex items-center gap-1 text-[10px] text-indigo-500 font-medium">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span>点击卡片翻面 (Click to Flip)</span>
                </div>

                {/* Front Side */}
                {!isFlipped ? (
                  <div className="text-center animate-fade-in flex flex-col items-center">
                    <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                      {activeFlashCard?.word}
                      <button 
                        onClick={(e) => handleSpeakWord(activeFlashCard?.word, e)}
                        className="p-1 px-1.5 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 text-indigo-600"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </h3>
                    <p className="text-sm font-mono text-zinc-400 mt-2">
                      {activeFlashCard?.phonetic || "/-/"}
                    </p>
                    <div className="mt-8 px-4 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-xs flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                      <span>还记得它的意思吗？点击翻牌</span>
                    </div>
                  </div>
                ) : (
                  /* Back Side */
                  <div className="text-center animate-fade-in w-full">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full">
                      中文释义
                    </span>
                    <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-300 mt-3">
                      {activeFlashCard?.translation}
                    </h3>

                    <div className="mt-5 text-left bg-stone-50 dark:bg-zinc-950/50 p-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 max-w-md mx-auto">
                      <p className="text-xs font-semibold text-zinc-400">例句 (Example):</p>
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-1 italic leading-relaxed">
                        “ {activeFlashCard?.exampleEn} ”
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {activeFlashCard?.exampleZh}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Arrows & Actions */}
              <div className="flex gap-4 items-center mt-6 w-full">
                <button
                  onClick={handlePrevCard}
                  className="flex-1 py-2 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer"
                >
                  上一个 (Previous)
                </button>
                <button
                  onClick={() => onRemoveWord(activeFlashCard?.word)}
                  className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                  title="标记为熟记，斩掉这个词"
                >
                  <CheckCircle className="h-4 w-4" />
                  已掌握 (Remove)
                </button>
                <button
                  onClick={handleNextCard}
                  className="flex-1 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm cursor-pointer"
                >
                  下一个 (Next Card)
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
                <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                <span>卡片式循环能够激活您的第二脑，强化右脑视觉记忆。</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-stone-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
          <span className="text-xs text-zinc-500">
            单词本数据使用 LocalStorage 永久存留在本浏览器中，清理缓存会抹除。
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-900 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold rounded-lg transition cursor-pointer"
          >
            完成学习关闭 (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
