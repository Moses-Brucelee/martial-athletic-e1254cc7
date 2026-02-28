import {
  STATUSES,
  getStatusLabel,
  getStatusIndex,
  getStatusColor,
  type CompetitionStatus,
} from "@/modules/tournaments/stateMachine";
import { Check } from "lucide-react";

interface CompetitionStatusBarProps {
  status: CompetitionStatus;
}

export function CompetitionStatusBar({ status }: CompetitionStatusBarProps) {
  const currentIndex = getStatusIndex(status);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {STATUSES.map((s, i) => {
          const isActive = s === status;
          const isPast = i < currentIndex;

          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && (
                <div className={`h-px w-4 shrink-0 ${isPast ? "bg-accent" : "bg-border"}`} />
              )}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive ? getStatusColor(s) : isPast ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {isPast && <Check className="h-3 w-3" />}
                {getStatusLabel(s)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
