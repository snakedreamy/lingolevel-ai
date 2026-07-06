import React, { useEffect, useState } from "react";
import { BookMarked, Trash2, Volume2, Layers, X, FileSpreadsheet } from "lucide-react";
import { WordBookListView } from "../features/wordbook/WordBookListView";
import { WordBookFlashcardView } from "../features/wordbook/WordBookFlashcardView";
import { speakText } from "../features/chat/speech";
import type { WordItem } from "../types";

interface WordBookProps {
  isOpen: boolean;
  onClose: () => void;
  wordList: WordItem[];
  onRemoveWord: (word: string) => void;
  onClearAll: () => void;
}

export default function WordBook({ isOpen, onClose, wordList, onRemoveWord, onClearAll }: WordBookProps) {
  const [activeTab, setActiveTab] = useState<"list" | "flashcard">("list");
  const [flashCardIndex, setFlashCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleSpeakWord = (word: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
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
    window.setTimeout(() => {
      setFlashCardIndex((prev) => (prev + 1) % wordList.length);
    }, 150);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    window.setTimeout(() => {
      setFlashCardIndex((prev) => (prev - 1 + wordList.length) % wordList.length);
    }, 150);
  };

  useEffect(() => {
    setFlashCardIndex(0);
    setIsFlipped(false);
  }, [activeTab]);

  useEffect(() => {
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

        <div className="px-4 sm:px-6 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "list"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              生词清单 ({wordList.length}词)
            </button>
            <button
              onClick={() => setActiveTab("flashcard")}
              disabled={wordList.length === 0}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                wordList.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : activeTab === "flashcard"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <Layers className="h-4 w-4" />
              記憶抽卡 (Flashcard Drill)
            </button>
          </div>

          {wordList.length > 0 && activeTab === "list" && (
            <button
              onClick={onClearAll}
              className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              清空全部生词
            </button>
          )}
        </div>

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
          ) : activeTab === "list" ? (
            <WordBookListView
              wordList={wordList}
              onRemoveWord={onRemoveWord}
              onSpeakWord={handleSpeakWord}
            />
          ) : (
            <WordBookFlashcardView
              wordList={wordList}
              activeFlashCard={activeFlashCard}
              safeFlashCardIndex={safeFlashCardIndex}
              isFlipped={isFlipped}
              onToggleFlip={() => setIsFlipped((prev) => !prev)}
              onPrevCard={handlePrevCard}
              onNextCard={handleNextCard}
              onRemoveWord={onRemoveWord}
              onSpeakWord={handleSpeakWord}
            />
          )}
        </div>

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
