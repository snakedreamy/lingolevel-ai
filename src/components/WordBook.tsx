// src/components/WordBook.tsx
// Merged: WordBook + WordBookListView + WordBookFlashcardView (from features/wordbook/)
import React, { useEffect, useState } from 'react'
import { BookMarked, Trash2, Volume2, Layers, X, FileSpreadsheet, ArrowLeftRight, CheckCircle, HelpCircle, TrendingUp } from 'lucide-react'
import { speakText } from '../lib/speech'
import type { WordItem } from '../types'

// ─── WordBookListView ────────────────────────────────────────────────────────

function WordBookListView({ wordList, onRemoveWord, onSpeakWord }: {
  wordList: WordItem[]
  onRemoveWord: (word: string) => void
  onSpeakWord: (word: string, event?: React.MouseEvent) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {wordList.map((item) => (
        <div key={item.word} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:shadow-md transition group">
          <div className="flex justify-between items-start gap-1">
            <div>
              <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                {item.word}
                <button onClick={(e) => onSpeakWord(item.word, e)}
                  className="p-1 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition cursor-pointer"
                  title="听发音" aria-label={`播放 ${item.word} 的发音`}>
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </h4>
              <span className="text-xs font-mono text-zinc-400 block mt-0.5">{item.phonetic}</span>
            </div>
            <button onClick={() => onRemoveWord(item.word)}
              className="p-1 text-zinc-400 hover:text-rose-600 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer"
              title="移出生词本" aria-label={`移出生词本：${item.word}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mt-2 bg-indigo-50/40 dark:bg-indigo-950/20 px-2 py-1 rounded inline-block">
            {item.translation}
          </p>
          <div className="mt-3 text-xs border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
            <p className="font-medium text-zinc-700 dark:text-zinc-300 italic">"{item.exampleEn}"</p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">{item.exampleZh}</p>
          </div>
          <div className="text-[9px] text-zinc-400 mt-3 flex justify-between items-center bg-stone-50 dark:bg-zinc-800 px-2 py-0.5 rounded">
            <span>Added in Chat</span>
            <span>{new Date(item.addTime).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── WordBookFlashcardView ───────────────────────────────────────────────────

function WordBookFlashcardView({ wordList, activeFlashCard, safeFlashCardIndex, isFlipped, onToggleFlip, onPrevCard, onNextCard, onRemoveWord, onSpeakWord }: {
  wordList: WordItem[]
  activeFlashCard: WordItem | undefined
  safeFlashCardIndex: number
  isFlipped: boolean
  onToggleFlip: () => void
  onPrevCard: () => void
  onNextCard: () => void
  onRemoveWord: (word: string) => void
  onSpeakWord: (word: string, event?: React.MouseEvent) => void
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto">
      <div onClick={onToggleFlip}
        className={`w-full aspect-[1.6/1] bg-white dark:bg-zinc-900 border-2 ${isFlipped ? 'border-indigo-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-2xl p-6 shadow-md cursor-pointer flex flex-col items-center justify-center relative hover:shadow-lg transition-all duration-300 select-none`}>
        <div className="absolute top-3 left-4 flex items-center gap-1.5 text-[10px] text-zinc-400">
          <Layers className="h-3 w-3" />
          <span>Card {safeFlashCardIndex + 1} / {wordList.length}</span>
        </div>
        <div className="absolute top-3 right-4 flex items-center gap-1 text-[10px] text-indigo-500 font-medium">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span>点击翻面</span>
        </div>

        {!isFlipped ? (
          <div className="text-center animate-fade-in flex flex-col items-center">
            <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
              {activeFlashCard?.word}
              <button onClick={(e) => onSpeakWord(activeFlashCard?.word ?? '', e)}
                className="p-1 px-1.5 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 text-indigo-600">
                <Volume2 className="h-4 w-4" />
              </button>
            </h3>
            <p className="text-sm font-mono text-zinc-400 mt-2">{activeFlashCard?.phonetic || '/-/'}</p>
            <div className="mt-8 px-4 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-xs flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
              <span>还记得它的意思吗？点击翻牌</span>
            </div>
          </div>
        ) : (
          <div className="text-center animate-fade-in w-full">
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full">中文释义</span>
            <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-300 mt-3">{activeFlashCard?.translation}</h3>
            <div className="mt-5 text-left bg-stone-50 dark:bg-zinc-950/50 p-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 max-w-md mx-auto">
              <p className="text-xs font-semibold text-zinc-400">例句:</p>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-1 italic leading-relaxed">"{activeFlashCard?.exampleEn}"</p>
              <p className="text-xs text-zinc-500 mt-1">{activeFlashCard?.exampleZh}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center mt-6 w-full">
        <button onClick={onPrevCard} className="flex-1 py-2 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer">
          上一个
        </button>
        <button onClick={() => { if (activeFlashCard) onRemoveWord(activeFlashCard.word) }}
          className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
          title="标记为熟记">
          <CheckCircle className="h-4 w-4" />
          已掌握
        </button>
        <button onClick={onNextCard} className="flex-1 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm cursor-pointer">
          下一个
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
        <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
        <span>卡片式循环能强化记忆。</span>
      </div>
    </div>
  )
}

// ─── WordBook (main export) ──────────────────────────────────────────────────

interface WordBookProps {
  isOpen: boolean
  onClose: () => void
  wordList: WordItem[]
  onRemoveWord: (word: string) => void
  onClearAll: () => void
}

export default function WordBook({ isOpen, onClose, wordList, onRemoveWord, onClearAll }: WordBookProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'flashcard'>('list')
  const [flashCardIndex, setFlashCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const handleSpeakWord = (word: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation()
    try { speakText({ text: word, accent: 'us', speed: 0.9, onStart: () => undefined, onEnd: () => undefined }) }
    catch (err) { console.error(err) }
  }

  const handleNextCard = () => {
    setIsFlipped(false)
    window.setTimeout(() => { setFlashCardIndex((prev) => (prev + 1) % wordList.length) }, 150)
  }

  const handlePrevCard = () => {
    setIsFlipped(false)
    window.setTimeout(() => { setFlashCardIndex((prev) => (prev - 1 + wordList.length) % wordList.length) }, 150)
  }

  useEffect(() => { setFlashCardIndex(0); setIsFlipped(false) }, [activeTab])
  useEffect(() => { setFlashCardIndex((i) => Math.min(i, Math.max(0, wordList.length - 1))) }, [wordList.length])

  if (!isOpen) return null

  const safeIndex = wordList.length > 0 ? Math.min(flashCardIndex, wordList.length - 1) : 0
  const activeFlashCard = wordList[safeIndex]

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
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">我的生词本</h2>
              <p className="hidden text-xs text-zinc-500 sm:block">聊天时一键加星的词汇，可用清单或抽卡复习。</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 transition" aria-label="关闭生词本">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {(['list', 'flashcard'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                disabled={tab === 'flashcard' && wordList.length === 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${tab === activeTab ? 'bg-indigo-600 text-white shadow-sm' : wordList.length === 0 && tab === 'flashcard' ? 'opacity-50 cursor-not-allowed text-zinc-600 dark:text-zinc-300' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}>
                {tab === 'list' ? <><FileSpreadsheet className="h-4 w-4" />生词清单 ({wordList.length}词)</> : <><Layers className="h-4 w-4" />记忆抽卡</>}
              </button>
            ))}
          </div>
          {wordList.length > 0 && activeTab === 'list' && (
            <button onClick={onClearAll} className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg flex items-center gap-1 transition-colors cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" />清空全部
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-50/30 dark:bg-zinc-950/20">
          {wordList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
              <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 mb-4 border border-dashed border-zinc-300">
                <BookMarked className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">还没有收录任何生词</h3>
              <p className="text-xs text-zinc-500 mt-2">在反馈面板的词汇卡片里点击 "+词本" 即可收录。</p>
            </div>
          ) : activeTab === 'list' ? (
            <WordBookListView wordList={wordList} onRemoveWord={onRemoveWord} onSpeakWord={handleSpeakWord} />
          ) : (
            <WordBookFlashcardView wordList={wordList} activeFlashCard={activeFlashCard} safeFlashCardIndex={safeIndex}
              isFlipped={isFlipped} onToggleFlip={() => setIsFlipped((p) => !p)}
              onPrevCard={handlePrevCard} onNextCard={handleNextCard}
              onRemoveWord={onRemoveWord} onSpeakWord={handleSpeakWord} />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-stone-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
          <span className="text-xs text-zinc-500">词本数据保存在本浏览器 LocalStorage，清缓存会抹除。</span>
          <button onClick={onClose} className="px-4 py-2 text-xs bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-900 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold rounded-lg transition cursor-pointer">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
