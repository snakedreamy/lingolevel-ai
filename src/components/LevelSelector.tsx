import { DifficultyLevel } from "../types";
import { LEVELS } from "../data/levels";
import { GraduationCap } from "lucide-react";

interface LevelSelectorProps {
  currentLevel: DifficultyLevel;
  onLevelChange: (level: DifficultyLevel) => void;
}

export default function LevelSelector({ currentLevel, onLevelChange }: LevelSelectorProps) {
  return (
    <section className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          学习难度
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {LEVELS.map((level) => {
          const isActive = currentLevel === level.id;
          return (
            <button
              key={level.id}
              onClick={() => onLevelChange(level.id)}
              type="button"
              aria-pressed={isActive}
              className={`flex flex-col rounded-xl border p-2.5 text-left transition-colors duration-200 ${
                isActive
                  ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-100"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
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
      
      {(() => {
        const activeDetails = LEVELS.find((l) => l.id === currentLevel);
        if (!activeDetails) return null;
        return (
          <div className="mt-3 border-l-2 border-indigo-500 py-1 pl-3 text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                当前设定：<span className="text-indigo-600 dark:text-indigo-400">{activeDetails.name}</span>
                <span className="mx-2 text-zinc-300 dark:text-zinc-700">·</span>
                词汇目标：<span className="text-emerald-600 dark:text-emerald-400">{activeDetails.vocabularyRange}</span>
              </p>
              <p className="text-zinc-500 dark:text-zinc-400">{activeDetails.description}</p>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
