import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw } from "lucide-react";
import { formatClock, type TimerSpec } from "../timer";
import { useWorkoutTimer } from "../hooks/useWorkoutTimer";

interface Props {
  spec: TimerSpec;
  autoStart?: boolean;
  compact?: boolean;
}

/** Timer UI. Mode, duration and rounds all come from workout metadata. */
export function WorkoutTimer({ spec, autoStart = false, compact = false }: Props) {
  const t = useWorkoutTimer(spec, autoStart);
  const display = spec.direction === "down" && t.remaining != null ? t.remaining : t.elapsed;

  return (
    <div
      className={`rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"} space-y-3`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {spec.label}
        </span>
        <div className="flex items-center gap-1.5">
          {spec.rounds ? (
            <Badge variant="secondary" className="text-[10px]">
              Round {t.round}/{spec.rounds}
            </Badge>
          ) : null}
          {t.phase ? (
            <Badge variant={t.phase === "work" ? "default" : "outline"} className="text-[10px] uppercase">
              {t.phase}
            </Badge>
          ) : null}
        </div>
      </div>

      <div
        className={`text-center font-bold tabular-nums text-foreground ${
          compact ? "text-3xl" : "text-5xl"
        } ${t.finished ? "text-primary" : ""}`}
      >
        {formatClock(display)}
      </div>

      <div className="flex items-center justify-center gap-2">
        {t.running ? (
          <Button size="sm" variant="outline" onClick={t.pause} className="uppercase text-xs font-semibold">
            <Pause className="h-3.5 w-3.5 mr-1.5" /> Pause
          </Button>
        ) : (
          <Button size="sm" onClick={t.start} className="uppercase text-xs font-semibold">
            <Play className="h-3.5 w-3.5 mr-1.5" /> {t.elapsed > 0 ? "Resume" : "Start"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={t.reset} aria-label="Reset timer">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
