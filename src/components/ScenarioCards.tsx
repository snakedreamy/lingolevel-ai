import type { Scenario } from "../types";
import { SCENARIOS } from "../data/scenarios";
import { MessageSquare } from "./Icon";

interface ScenarioCardsProps {
  activeScenarioId: string;
  onScenarioSelect: (scenario: Scenario) => void;
}

export default function ScenarioCards({ activeScenarioId, onScenarioSelect }: ScenarioCardsProps) {
  return (
    <section className="w-full border-t border-ink/15 pt-5 dark:border-ink-dark/20">
      <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4.5 w-4.5 text-forest dark:text-forest-dark" />
          <h3 className="text-sm font-bold text-ink dark:text-ink-dark">对话与练习场景</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {SCENARIOS.map((scenario) => {
          const isActive = activeScenarioId === scenario.id;
          const IconComponent = scenario.icon;

          return (
            <button
              key={scenario.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onScenarioSelect(scenario)}
              className={`group flex flex-col items-center rounded-md border p-3 text-center transition-colors duration-200 ${
                isActive
                  ? "border-forest bg-forest/5 dark:border-forest-dark dark:bg-forest-dark/10"
                  : "border-ink/15 bg-leaf hover:border-ink/40 dark:border-ink-dark/20 dark:bg-leaf-dark dark:hover:border-ink-dark/50"
              }`}
            >
              <div className={`mb-2 rounded-md p-2 transition-transform duration-200 group-hover:-translate-y-0.5 ${
                isActive ? "bg-forest text-paper dark:bg-forest-dark dark:text-paper-dark" : "bg-ink/5 text-ink/60 dark:bg-ink-dark/10 dark:text-ink-dark/60"
              }`}>
                <IconComponent className="h-4.5 w-4.5" />
              </div>
              <span className="line-clamp-1 text-xs font-semibold text-ink dark:text-ink-dark">{scenario.name}</span>
              <span className="mt-0.5 line-clamp-1 text-[10px] text-ink/45 dark:text-ink-dark/45">
                {scenario.englishName}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
