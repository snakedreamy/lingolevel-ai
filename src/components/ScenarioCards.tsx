import { Scenario } from "../types";
import { SCENARIOS } from "../data/scenarios";
import { 
  Coffee, 
  Plane, 
  MapPin, 
  Briefcase, 
  Hotel, 
  MessageSquare,
  Sparkles
} from "lucide-react";

interface ScenarioCardsProps {
  activeScenarioId: string;
  onScenarioSelect: (scenario: Scenario) => void;
}

// Map icon string names to components
const iconMap: Record<string, any> = {
  Coffee: Coffee,
  Plane: Plane,
  MapPin: MapPin,
  Briefcase: Briefcase,
  Hotel: Hotel,
  MessageSquare: MessageSquare
};

export default function ScenarioCards({ activeScenarioId, onScenarioSelect }: ScenarioCardsProps) {
  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            精选情景实战口语 (Conversational Scenarios)
          </h3>
        </div>
        <span className="text-xs text-zinc-500">
          点击立即切入主题对话
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {SCENARIOS.map((scenario) => {
          const isActive = activeScenarioId === scenario.id;
          const IconComponent = iconMap[scenario.icon] || MessageSquare;
          
          return (
            <button
              key={scenario.id}
              onClick={() => onScenarioSelect(scenario)}
              className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all duration-205 cursor-pointer relative overflow-hidden group ${
                isActive
                  ? "border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 ring-2 ring-indigo-50 dark:ring-indigo-900/10 text-indigo-950 dark:text-indigo-100"
                  : "border-zinc-200 bg-stone-50/20 dark:border-zinc-800 dark:bg-zinc-900/25 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-stone-50/70"
              }`}
            >
              <div className={`p-2 rounded-lg mb-2 transition-transform duration-300 group-hover:scale-110 ${
                isActive ? "bg-indigo-600 text-white shadow-sm" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}>
                <IconComponent className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-semibold line-clamp-1">{scenario.name}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                {scenario.englishName}
              </span>
              
              {isActive && (
                <div className="absolute right-0 top-0 h-4 w-4 bg-indigo-600 rounded-bl-lg flex items-center justify-center">
                  <div className="h-1.5 w-1.5 bg-white rounded-full"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
