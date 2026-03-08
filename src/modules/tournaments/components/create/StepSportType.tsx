import { useCompetitionTypes } from "@/modules/tournaments/hooks-engine";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Dumbbell, Swords, Shield, Layers } from "lucide-react";

const SPORT_ICONS: Record<string, React.ReactNode> = {
  crossfit: <Dumbbell className="h-7 w-7" />,
  mma: <Swords className="h-7 w-7" />,
  bjj: <Shield className="h-7 w-7" />,
  other: <Layers className="h-7 w-7" />,
};

interface StepSportTypeProps {
  selected: string;
  onSelect: (key: string) => void;
  disabled?: boolean;
}

export function StepSportType({ selected, onSelect, disabled }: StepSportTypeProps) {
  const { data: types = [], isLoading } = useCompetitionTypes();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose the sport type for your competition. This determines default scoring rules and workout formats.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {types.filter((t) => t.is_active).map((t) => {
          const isSelected = selected === t.key;
          return (
            <button
              key={t.key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(t.key)}
              className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all text-center ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
              } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <div className={isSelected ? "text-primary" : "text-muted-foreground"}>
                {SPORT_ICONS[t.key] || <Layers className="h-7 w-7" />}
              </div>
              <div>
                <p className={`font-bold text-sm uppercase tracking-wide ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {t.label}
                </p>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selected === "crossfit" && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
          <p className="text-xs text-foreground font-semibold uppercase tracking-wider mb-1">CrossFit Mode</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Optimized for functional fitness — supports AMRAP, For Time, Max Load, EMOM, Chipper, and more.
            Automatic point-based leaderboard ranking with CrossFit-standard tie-break logic.
          </p>
        </div>
      )}

      {selected === "mma" && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
          <p className="text-xs text-foreground font-semibold uppercase tracking-wider mb-1">MMA Mode</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bracket-based tournament with single or double elimination.
            Supports weight classes as divisions and bout-by-bout scoring.
          </p>
        </div>
      )}

      {selected === "bjj" && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
          <p className="text-xs text-foreground font-semibold uppercase tracking-wider mb-1">BJJ Mode</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Belt-rank and weight-class divisions with bracket-based elimination.
            Points, submissions, and advantage tracking.
          </p>
        </div>
      )}
    </div>
  );
}
