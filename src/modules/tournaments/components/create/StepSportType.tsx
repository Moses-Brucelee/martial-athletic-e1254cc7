import { useEffect } from "react";
import { useCompetitionTypes } from "@/modules/tournaments/hooks-engine";
import { useAllFeatureFlags } from "@/hooks/useFeatureFlag";


import { Skeleton } from "@/components/ui/skeleton";
import { Check, Dumbbell, Swords, Shield, Layers, Zap, Settings2 } from "lucide-react";

const SPORT_ICONS: Record<string, React.ReactNode> = {
  crossfit: <Dumbbell className="h-7 w-7" />,
  mma: <Swords className="h-7 w-7" />,
  bjj: <Shield className="h-7 w-7" />,
  other: <Layers className="h-7 w-7" />,
};

interface StepSportTypeProps {
  selected: string;
  onSelect: (key: string) => void;
  setupMode: "quick" | "advanced";
  onSetupModeChange: (mode: "quick" | "advanced") => void;
  disabled?: boolean;
}

export function StepSportType({ selected, onSelect, setupMode, onSetupModeChange, disabled }: StepSportTypeProps) {
  const { data: types = [], isLoading } = useCompetitionTypes();
  const { data: flags } = useAllFeatureFlags();
  // Use the raw DB flag value (not the super-user preview override) so the
  // Advanced mode is hidden by default unless explicitly enabled in the
  // feature_flags table. Super users can still toggle it from the flags admin.
  const advancedEnabled = flags?.["advanced_competition_setup"]?.enabled ?? false;

  // When the advanced builder is disabled, everyone stays on quick setup.
  useEffect(() => {
    if (!advancedEnabled && setupMode !== "quick") onSetupModeChange("quick");
  }, [advancedEnabled, setupMode, onSetupModeChange]);



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

      {/* Setup mode selector — only for CrossFit */}
      {selected === "crossfit" && advancedEnabled && (
        <div className="space-y-3 mt-6">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Setup Mode</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "quick" as const, icon: <Zap className="h-5 w-5" />, label: "Quick Setup", desc: "Simple points-based scoring. Judges enter points directly per workout." },
              { key: "advanced" as const, icon: <Settings2 className="h-5 w-5" />, label: "Advanced", desc: "Full workout builder with movements, scoring types, heats & lanes." },
            ]).map((mode) => {
              const isSelected = setupMode === mode.key;
              return (
                <button
                  key={mode.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSetupModeChange(mode.key)}
                  className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
                >
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                  <div className={isSelected ? "text-primary" : "text-muted-foreground"}>{mode.icon}</div>
                  <p className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>{mode.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{mode.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected === "crossfit" && setupMode === "quick" && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
          <p className="text-xs text-foreground font-semibold uppercase tracking-wider mb-1">Quick Setup — Points Mode</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Create divisions and text-based workouts. Judges enter points per team per workout. 
            Leaderboard auto-ranks by total points. Perfect for simple throwdowns and community events.
          </p>
        </div>
      )}

      {selected === "crossfit" && setupMode === "advanced" && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
          <p className="text-xs text-foreground font-semibold uppercase tracking-wider mb-1">Advanced — Full Control</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Full workout builder with AMRAP, For Time, Max Load scoring. Movement-level detail,
            heat scheduling, lane assignments, and CrossFit-standard leaderboard ranking.
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

