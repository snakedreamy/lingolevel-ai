import type { DifficultyLevel } from "../types"
import { LEVELS } from "../data/levels"
import { GraduationCap } from "./Icon"

interface LevelSelectorProps {
  currentLevel: DifficultyLevel
  onLevelChange: (level: DifficultyLevel) => void
}

export default function LevelSelector({ currentLevel, onLevelChange }: LevelSelectorProps) {
  const activeDetails = LEVELS.find((l) => l.id === currentLevel)
  return (
    <section className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <GraduationCap className="h-4.5 w-4.5 text-forest dark:text-forest-dark" />
        <h3 className="text-sm font-bold">学习难度</h3>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
        {LEVELS.map((level, index) => {
          const isActive = currentLevel === level.id
          return (
            <button
              key={level.id}
              onClick={() => onLevelChange(level.id)}
              type="button"
              aria-pressed={isActive}
              className={`flex cursor-pointer flex-col rounded-md border p-2.5 text-left transition-colors duration-200 ${
                isActive
                  ? "border-forest bg-forest/5 dark:border-forest-dark dark:bg-forest-dark/10"
                  : "ui-rule ui-surface hover:border-ink/40 dark:hover:border-ink-dark/50"
              }`}
            >
              <span className="margin-code">{String(index + 1).padStart(2, "0")}</span>
              <span className={`mt-1 text-xs font-bold leading-tight ${isActive ? "text-forest dark:text-forest-dark" : "ui-text-muted"}`}>
                {level.name.split(" ")[0]}
              </span>
              <span className="mt-0.5 truncate text-[10px] ui-text-faint">
                {level.englishName}
              </span>
            </button>
          )
        })}
      </div>

      {activeDetails && (
        <div className="mt-3 border-l-2 border-forest py-1 pl-3 text-xs dark:border-forest-dark">
          <div className="space-y-1">
            <p className="font-semibold ui-text-muted">
              当前设定：<span className="text-forest dark:text-forest-dark">{activeDetails.name}</span>
              <span className="mx-2 ui-text-faint">·</span>
              词汇目标：<span className="ui-text-muted">{activeDetails.vocabularyRange}</span>
            </p>
            <p className="ui-text-faint">{activeDetails.description}</p>
          </div>
        </div>
      )}
    </section>
  )
}
