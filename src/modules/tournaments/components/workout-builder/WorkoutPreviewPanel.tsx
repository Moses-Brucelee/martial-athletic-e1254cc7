import { Badge } from "@/components/ui/badge";
import { Eye, Trophy, Gavel, Timer, ArrowUp, ArrowDown, CheckCircle2, BarChart3 } from "lucide-react";
import type { LocalWorkout } from "./types";
import { WORKOUT_FORMATS, SCORING_LABELS, calcRepsPerRound, needsTimeCap } from "./types";

interface Props {
  workout: LocalWorkout;
  workoutIndex: number;
}

export function WorkoutPreviewPanel({ workout, workoutIndex }: Props) {
  const format = WORKOUT_FORMATS.find((f) => f.value === workout.workout_type);
  const scoring = SCORING_LABELS[workout.scoring_type] || SCORING_LABELS.points;
  const repsPerRound = calcRepsPerRound(workout.movements);
  const hasMovements = workout.movements.some((m) => m.movement_name.trim());
  const timeCap = parseInt(workout.time_cap_seconds) || 0;
  const timeCapDisplay = timeCap > 0 ? `${Math.floor(timeCap / 60)}:${(timeCap % 60).toString().padStart(2, "0")}` : null;

  // Difficulty estimator
  const estimatedRounds = timeCap > 0 && repsPerRound > 0
    ? Math.round((timeCap / 60) * (repsPerRound / repsPerRound) * 0.85) // ~0.85 rounds/min for avg athlete
    : null;
  const estimatedTotalReps = estimatedRounds && repsPerRound ? estimatedRounds * repsPerRound : null;

  return (
    <div className="space-y-4">
      {/* Live Preview */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Live Preview</h3>
        </div>

        <div className="rounded-xl border-2 border-primary/20 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Workout {workoutIndex + 1}
            </h4>
            <Badge className="bg-primary text-primary-foreground text-[10px] uppercase">
              {format?.label || workout.workout_type}
            </Badge>
          </div>

          {workout.name && (
            <h3 className="text-lg font-bold text-foreground tracking-tight">{workout.name}</h3>
          )}

          {timeCapDisplay && (
            <div className="flex items-center gap-1.5 text-sm text-accent font-semibold">
              <Timer className="h-4 w-4" />
              {format?.label || "AMRAP"} {timeCapDisplay}
            </div>
          )}

          {hasMovements ? (
            <div className="space-y-1.5 pt-1">
              {workout.movements.filter((m) => m.movement_name.trim()).map((m, i) => (
                <div key={i} className="flex items-baseline gap-2 text-sm">
                  <span className="font-bold text-foreground tabular-nums min-w-[32px] text-right">
                    {m.reps || "–"}
                  </span>
                  <span className="text-foreground">{m.movement_name}</span>
                  {m.weight && (
                    <span className="text-muted-foreground text-xs">({m.weight} {m.unit})</span>
                  )}
                  {m.distance && (
                    <span className="text-muted-foreground text-xs">{m.distance}m</span>
                  )}
                  {m.calories && (
                    <span className="text-muted-foreground text-xs">{m.calories} cal</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Add movements to see preview...</p>
          )}

          {repsPerRound > 0 && (
            <div className="pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {repsPerRound} reps per round
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Difficulty Estimator */}
      {(workout.workout_type === "amrap" || workout.workout_type === "emom") && repsPerRound > 0 && timeCap > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Difficulty</h3>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Est. Rounds</span>
              <span className="text-xs font-bold text-foreground">{estimatedRounds}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Est. Total Reps</span>
              <span className="text-xs font-bold text-foreground">{estimatedTotalReps}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Reps / Round</span>
              <span className="text-xs font-bold text-foreground">{repsPerRound}</span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">*Average athlete pace estimate</p>
          </div>
        </div>
      )}

      {/* Scoring Logic */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Scoring Logic</h3>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Score Type</span>
            <Badge variant="outline" className="text-[10px]">{scoring.label}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {workout.scoring_type === "time" ? (
              <ArrowDown className="h-3 w-3 text-accent" />
            ) : (
              <ArrowUp className="h-3 w-3 text-accent" />
            )}
            <span className="text-xs text-foreground">{scoring.logic}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Tie Break: {scoring.tieBreak}</span>
          </div>
        </div>
      </div>

      {/* Judge Capture Preview */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Gavel className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Judge View</h3>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Athlete — Lane 4</span>
            <Badge variant="secondary" className="text-[10px]">Round 1</Badge>
          </div>

          {hasMovements ? (
            <div className="space-y-1">
              {workout.movements.filter((m) => m.movement_name.trim()).map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {i < 2 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-border shrink-0" />
                  )}
                  <span className={i < 2 ? "text-muted-foreground line-through" : "text-foreground"}>
                    {m.reps || "–"} {m.movement_name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Movements will appear here</p>
          )}

          <div className="grid grid-cols-2 gap-1.5 pt-2">
            <div className="rounded-md bg-accent/10 border border-accent/20 py-2 sm:py-1.5 text-center text-[10px] font-bold text-accent uppercase">
              + Rep
            </div>
            <div className="rounded-md bg-accent/10 border border-accent/20 py-2 sm:py-1.5 text-center text-[10px] font-bold text-accent uppercase">
              Complete Movement
            </div>
            <div className="rounded-md bg-primary/10 border border-primary/20 py-2 sm:py-1.5 text-center text-[10px] font-bold text-primary uppercase">
              Complete Round
            </div>
            <div className="rounded-md bg-primary/10 border border-primary/20 py-2 sm:py-1.5 text-center text-[10px] font-bold text-primary uppercase">
              Finish
            </div>
          </div>
        </div>
      </div>

      {/* Validation */}
      {workout.workout_type === "amrap" && !workout.time_cap_seconds && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs text-destructive font-medium">⚠ AMRAP workouts require a time cap</p>
        </div>
      )}
      {workout.workout_type === "max_load" && !workout.movements.some((m) => m.weight) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs text-destructive font-medium">⚠ Max Load workouts should include weight</p>
        </div>
      )}
    </div>
  );
}
