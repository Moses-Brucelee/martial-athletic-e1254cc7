import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Lock, Save, Clock, Dumbbell, Repeat, Award, XCircle, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useScores, useUpsertScores } from "@/modules/scoring/hooks";
import { useTeams, useWorkouts } from "@/modules/tournaments/hooks";
import { formatSecondsDisplay } from "@/modules/scoring/components/TimeInput";
import { TimeCaptureField } from "@/modules/scoring/components/TimeCaptureField";

interface MobileJudgeScoringProps {
  competitionId: string;
  judgeId?: string;
}

type ScoringType = "time" | "reps" | "load" | "points";

const SCORING_LABELS: Record<ScoringType, string> = {
  time: "Time",
  reps: "Total Reps",
  load: "Load (kg)",
  points: "Points",
};

const SCORING_ICONS: Record<ScoringType, typeof Clock> = {
  time: Clock,
  reps: Repeat,
  load: Dumbbell,
  points: Award,
};

function getRawFieldKey(scoringType: ScoringType): "time_seconds" | "reps_completed" | "load_value" | "points_awarded" {
  switch (scoringType) {
    case "time": return "time_seconds";
    case "reps": return "reps_completed";
    case "load": return "load_value";
    case "points": return "points_awarded";
  }
}

/** Normalize any DB scoring_type (incl. "max_reps", legacy values, null) to a known key. */
function normalizeScoringType(raw: unknown): ScoringType {
  switch (raw) {
    case "time":
    case "reps":
    case "load":
    case "points":
      return raw;
    case "max_reps":
    case "amrap":
      return "reps";
    case "weight":
      return "load";
    default:
      return "points";
  }
}

function getDisplayValue(scoreRow: any, scoringType: ScoringType): string {
  const fieldKey = getRawFieldKey(scoringType);
  const raw = scoreRow?.[fieldKey];
  if (raw != null) return String(raw);
  if (scoreRow?.score != null) return String(scoreRow.score);
  return "0";
}

export function MobileJudgeScoring({ competitionId, judgeId }: MobileJudgeScoringProps) {
  const { data: teams = [] } = useTeams(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: scoreRows = [] } = useScores(competitionId);
  const upsertMutation = useUpsertScores();

  const [localScores, setLocalScores] = useState<Record<string, string>>({});
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [dnfTeams, setDnfTeams] = useState<Set<string>>(new Set());

  const workoutScoringMap = useMemo(() => {
    const map: Record<string, ScoringType> = {};
    workouts.forEach((w) => { map[w.id] = normalizeScoringType(w.scoring_type); });
    return map;
  }, [workouts]);

  useEffect(() => {
    if (workouts.length > 0 && !selectedWorkoutId) {
      const unlocked = workouts.find((w) => !w.is_locked);
      setSelectedWorkoutId(unlocked?.id || workouts[0].id);
    }
  }, [workouts, selectedWorkoutId]);

  useEffect(() => {
    const map: Record<string, string> = {};
    scoreRows.forEach((s) => {
      const st = workoutScoringMap[s.workout_id] || "points";
      map[`${s.team_id}::${s.workout_id}`] = getDisplayValue(s, st);
    });
    setLocalScores(map);
  }, [scoreRows, workoutScoringMap]);

  const currentTeam = teams[currentTeamIndex];
  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId);
  const currentScoringType: ScoringType = selectedWorkoutId ? (workoutScoringMap[selectedWorkoutId] || "reps") : "reps";
  const CurrentIcon = SCORING_ICONS[currentScoringType];

  const updateScore = (value: string) => {
    if (!currentTeam || !selectedWorkoutId) return;
    setLocalScores((prev) => ({ ...prev, [`${currentTeam.id}::${selectedWorkoutId}`]: value }));
  };

  const adjustScore = (delta: number) => {
    if (!currentTeam || !selectedWorkoutId) return;
    const key = `${currentTeam.id}::${selectedWorkoutId}`;
    const current = Number(localScores[key] || 0);
    const newVal = Math.max(0, current + delta);
    setLocalScores((prev) => ({ ...prev, [key]: String(newVal) }));
  };

  const handleDNF = () => {
    if (!currentTeam || !selectedWorkoutId) return;
    setDnfTeams((prev) => new Set(prev).add(`${currentTeam.id}::${selectedWorkoutId}`));
    // Set score to 0 for DNF
    setLocalScores((prev) => ({ ...prev, [`${currentTeam.id}::${selectedWorkoutId}`]: "0" }));
    toast.info(`${currentTeam.team_name} marked as DNF`);
  };

  const handleFinish = () => {
    if (!currentTeam || !selectedWorkoutId) return;
    // For time-based: auto-capture a reasonable score; otherwise just confirm
    toast.success(`${currentTeam.team_name} finished!`);
    // Move to next team
    if (currentTeamIndex < teams.length - 1) {
      setCurrentTeamIndex(currentTeamIndex + 1);
    }
  };

  const saveAllScores = async () => {
    const upserts = Object.entries(localScores)
      .filter(([, val]) => val !== "" && !isNaN(Number(val)))
      .map(([key, val]) => {
        const [team_id, workout_id] = key.split("::");
        const st = workoutScoringMap[workout_id] || "points";
        const numVal = Number(val);
        const rawField = getRawFieldKey(st);
        return {
          competition_id: competitionId,
          team_id,
          workout_id,
          score: numVal,
          judge_id: judgeId || null,
          [rawField]: numVal,
        };
      });

    try {
      await upsertMutation.mutateAsync(upserts);
      toast.success("Scores saved!");
    } catch {
      toast.error("Failed to save scores");
    }
  };

  if (teams.length === 0 || workouts.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Add teams and workouts first to enter scores.</p>
      </div>
    );
  }

  const currentScore = currentTeam ? (localScores[`${currentTeam.id}::${selectedWorkoutId}`] || "0") : "0";
  const isDnf = currentTeam ? dnfTeams.has(`${currentTeam.id}::${selectedWorkoutId}`) : false;

  const quickAdjusts = currentScoringType === "load" ? [5, 10, 25] :
                        currentScoringType === "time" ? [5, 15, 30] :
                        [1, 5, 10];

  return (
    <div className="flex flex-col h-full min-h-[60vh]">
      {/* Workout selector pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 px-1">
        {workouts.map((w) => {
          const st = normalizeScoringType(w.scoring_type);
          const Icon = SCORING_ICONS[st];
          return (
            <button
              key={w.id}
              onClick={() => setSelectedWorkoutId(w.id)}
              className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                selectedWorkoutId === w.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Icon className="h-3 w-3" />
              {w.name || `WOD ${w.workout_number}`}
              {w.is_locked && <Lock className="h-3 w-3" />}
            </button>
          );
        })}
      </div>

      {/* Team card */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" className="h-12 w-12"
              onClick={() => setCurrentTeamIndex(Math.max(0, currentTeamIndex - 1))}
              disabled={currentTeamIndex === 0} aria-label="Previous team">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {currentTeamIndex + 1} / {teams.length}
              </p>
              <h3 className="text-lg sm:text-xl font-black text-foreground mt-1 break-words leading-tight">{currentTeam?.team_name}</h3>
              {currentTeam?.division && (
                <p className="text-sm text-primary font-medium mt-0.5">{currentTeam.division}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-12 w-12"
              onClick={() => setCurrentTeamIndex(Math.min(teams.length - 1, currentTeamIndex + 1))}
              disabled={currentTeamIndex === teams.length - 1} aria-label="Next team">
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Scoring type label */}
          <div className="flex items-center justify-center gap-1 mb-3 text-xs text-muted-foreground uppercase tracking-wider">
            <CurrentIcon className="h-3.5 w-3.5" />
            {SCORING_LABELS[currentScoringType]}
          </div>

          {selectedWorkout?.is_locked ? (
            <div className="text-center py-6">
              <Lock className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive font-bold">Workout locked</p>
              <p className="text-3xl font-black text-foreground mt-2">
                {currentScoringType === "time" ? formatSecondsDisplay(currentScore) :
                 currentScoringType === "load" ? `${currentScore}kg` : currentScore}
              </p>
            </div>
          ) : isDnf ? (
            <div className="text-center py-6">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-lg font-black text-destructive">DNF</p>
              <Button variant="outline" size="sm" className="mt-2 text-xs"
                onClick={() => {
                  const newSet = new Set(dnfTeams);
                  newSet.delete(`${currentTeam.id}::${selectedWorkoutId}`);
                  setDnfTeams(newSet);
                }}>
                Undo DNF
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {currentScoringType === "time" ? (
                <div className="flex justify-center">
                  <TimeCaptureField
                    value={currentScore}
                    onChange={(v) => updateScore(v)}
                    size="lg"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-14 w-14 text-xl font-bold shrink-0"
                    onClick={() => adjustScore(-1)} aria-label="Decrease score">−</Button>
                  <div className="flex-1 relative">
                    <Input type="number" value={currentScore}
                      onChange={(e) => updateScore(e.target.value)}
                      className="h-14 text-center text-2xl font-black bg-background pr-8" />
                    {currentScoringType === "load" && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kg</span>
                    )}
                  </div>
                  <Button variant="outline" size="icon" className="h-14 w-14 text-xl font-bold shrink-0"
                    onClick={() => adjustScore(1)} aria-label="Increase score">+</Button>
                </div>
              )}

              {/* Quick adjusts */}
              <div className="flex gap-2 justify-center">
                {quickAdjusts.map((n) => (
                  <Button key={n} variant="secondary" size="sm" className="text-xs font-bold min-w-[48px] min-h-[48px]"
                    onClick={() => adjustScore(n)}>
                    <Plus className="h-3 w-3 mr-0.5" />{n}
                  </Button>
                ))}
              </div>

              {/* Quick action buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button variant="outline" className="h-12 text-xs font-bold border-accent text-accent hover:bg-accent/10"
                  onClick={handleFinish}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Finish
                </Button>
                <Button variant="outline" className="h-12 text-xs font-bold border-destructive text-destructive hover:bg-destructive/10"
                  onClick={handleDNF}>
                  <XCircle className="h-4 w-4 mr-1" />
                  DNF
                </Button>
                <Button variant="secondary" className="h-12 text-xs font-bold"
                  onClick={() => {
                    if (currentTeamIndex < teams.length - 1) setCurrentTeamIndex(currentTeamIndex + 1);
                  }}
                  disabled={currentTeamIndex === teams.length - 1}>
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky save button */}
      <div className="sticky bottom-0 p-4 bg-background border-t border-border">
        <Button onClick={saveAllScores} disabled={upsertMutation.isPending}
          className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg">
          <Save className="h-5 w-5 mr-2" />
          {upsertMutation.isPending ? "Saving..." : "Save All Scores"}
        </Button>
      </div>
    </div>
  );
}
