import { DifficultyLevel } from "../types";
import { LEVELS } from "../data/levels";
import { GraduationCap, Sparkles, BookOpen } from "lucide-react";

interface LevelSelectorProps {
  currentLevel: DifficultyLevel;
  onLevelChange: (level: DifficultyLevel) => void;
}

export default function LevelSelector({ currentLevel, onLevelChange }: LevelSelectorProps) {
  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          学习难度与词汇范围 (Difficulty Level Choice)
        </h3>
        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium dark:bg-indigo-900/40 dark:text-indigo-300">
          可随时切换，AI 会立即调整用词
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {LEVELS.map((level) => {
          const isActive = currentLevel === level.id;
          return (
            <button
              key={level.id}
              onClick={() => onLevelChange(level.id)}
              className={`flex flex-col text-left p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                isActive
                  ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-100 dark:ring-indigo-900/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-stone-50/40 dark:bg-zinc-900/40"
              }`}
            >
              <span className={`text-xs font-bold leading-tight ${isActive ? "text-indigo-700 dark:text-indigo-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                {level.name.split(" ")[0]}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                {level.englishName}
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="text-[9px] scale-95 origin-left bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded text-zinc-500 dark:text-zinc-400">
                  {level.ageGroup}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Current Level Subtitle Details */}
      {(() => {
        const activeDetails = LEVELS.find((l) => l.id === currentLevel);
        if (!activeDetails) return null;
        return (
          <div className="mt-3 text-xs bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-2.5 border border-dashed border-zinc-200 dark:border-zinc-800 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                当前设定：<span className="text-indigo-600 dark:text-indigo-400">{activeDetails.name}</span>
                <span className="mx-2 text-zinc-400">|</span>
                词汇目标：<span className="text-emerald-600 dark:text-emerald-400">{activeDetails.vocabularyRange}</span>
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                {activeDetails.description} (AI prompt strategy: {activeDetails.promptGuideline})
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
