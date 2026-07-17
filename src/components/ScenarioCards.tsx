import type { Scenario } from "../types";
import { SCENARIOS } from "../data/scenarios";
import { Sparkles } from "lucide-react";

interface ScenarioCardsProps {
  activeScenarioId: string;
  onScenarioSelect: (scenario: Scenario) => void;
}

export default function ScenarioCards({ activeScenarioId, onScenarioSelect }: ScenarioCardsProps) {
  return (
    <section className="w-full border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            对话与练习场景
          </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {SCENARIOS.map((scenario) => {
          const isActive = activeScenarioId === scenario.id;
          const IconComponent = scenario.icon;

          return (
            <button
              key={scenario.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onScenarioSelect(scenario)}
              className={`group flex flex-col items-center rounded-xl border p-3 text-center transition-colors duration-200 ${
                isActive
                  ? "border-indigo-500 bg-indigo-50 text-indigo-950 dark:bg-indigo-950/30 dark:text-indigo-100"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              }`}
            >
              <div className={`mb-2 rounded-lg p-2 transition-transform duration-200 group-hover:-translate-y-0.5 ${
                isActive ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}>
                <IconComponent className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-semibold line-clamp-1">{scenario.name}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                {scenario.englishName}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
