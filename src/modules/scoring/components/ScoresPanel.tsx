import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Save, Lock, Clock, Dumbbell, Repeat, Award } from "lucide-react";
import { toast } from "sonner";
import { useScores, useUpsertScores } from "@/modules/scoring/hooks";
import { useTeams, useWorkouts } from "@/modules/tournaments/hooks";
import { formatSecondsDisplay } from "@/modules/scoring/components/TimeInput";
import { TimeCaptureField } from "@/modules/scoring/components/TimeCaptureField";

interface ScoresPanelProps {
  competitionId: string;
  canScore: boolean;
  judgeId?: string;
}

type ScoringType = "time" | "reps" | "load" | "points";

const SCORING_ICONS: Record<ScoringType, typeof Clock> = {
  time: Clock,
  reps: Repeat,
  load: Dumbbell,
  points: Award,
};

const SCORING_LABELS: Record<ScoringType, string> = {
  time: "Time (h:m:s)",
  reps: "Reps",
  load: "Load (kg)",
  points: "Points",
};

/** Build the canonical score value from raw input based on scoring type */
function buildCanonicalScore(value: number, scoringType: ScoringType): number {
  return value;
}

/** Get the raw field name for a scoring type */
function getRawFieldKey(scoringType: ScoringType): "time_seconds" | "reps_completed" | "load_value" | "points_awarded" {
  switch (scoringType) {
    case "time": return "time_seconds";
    case "reps": return "reps_completed";
    case "load": return "load_value";
    case "points": return "points_awarded";
  }
}

/** Normalize any DB scoring_type (incl. "max_reps", legacy, null) to a known key. */
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

/** Extract display value from a score row based on workout scoring type */
function getDisplayValue(scoreRow: any, scoringType: ScoringType): string {
  const fieldKey = getRawFieldKey(scoringType);
  const raw = scoreRow?.[fieldKey];
  if (raw != null) return String(raw);
  if (scoreRow?.score != null) return String(scoreRow.score);
  return "";
}

export function ScoresPanel({ competitionId, canScore, judgeId }: ScoresPanelProps) {
  const { data: teams = [] } = useTeams(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: scoreRows = [] } = useScores(competitionId);
  const upsertMutation = useUpsertScores();

  const [localScores, setLocalScores] = useState<Record<string, string>>({});
  const [localWork, setLocalWork] = useState<Record<string, string>>({});
  const [localTieBreak, setLocalTieBreak] = useState<Record<string, string>>({});
  const [filterDivision, setFilterDivision] = useState<string>("all");

  // Build scoring type map from workouts
  const workoutScoringMap = useMemo(() => {
    const map: Record<string, ScoringType> = {};
    workouts.forEach((w) => {
      map[w.id] = normalizeScoringType(w.scoring_type);
    });
    return map;
  }, [workouts]);

  // Sync DB scores into local state using raw fields
  useEffect(() => {
    const map: Record<string, string> = {};
    scoreRows.forEach((s) => {
      const scoringType = workoutScoringMap[s.workout_id] || "points";
      map[`${s.team_id}::${s.workout_id}`] = getDisplayValue(s, scoringType);
    });
    const work: Record<string, string> = {};
    const tb: Record<string, string> = {};
    scoreRows.forEach((s: any) => {
      const k = `${s.team_id}::${s.workout_id}`;
      work[k] = s.work_completed != null ? String(s.work_completed) : "";
      tb[k] = s.tie_breaker_seconds != null ? String(s.tie_breaker_seconds) : "0";
    });
    setLocalScores(map);
    setLocalWork(work);
    setLocalTieBreak(tb);
  }, [scoreRows, workoutScoringMap]);

  // Per-workout tie breaker / target configuration
  const workoutConfigMap = useMemo(() => {
    const map: Record<string, { target: number | null; unit: string; tieBreaker: boolean }> = {};
    workouts.forEach((w: any) => {
      const st = normalizeScoringType(w.scoring_type);
      map[w.id] = {
        target: st === "time" && w.target_work != null ? Number(w.target_work) : null,
        unit: w.target_unit || "reps",
        tieBreaker: w.tie_breaker_type === "time",
      };
    });
    return map;
  }, [workouts]);

  // Get unique divisions for filter
  const divisions = useMemo(() => {
    const divs = new Set<string>();
    teams.forEach((t) => { if (t.division) divs.add(t.division); });
    return Array.from(divs);
  }, [teams]);

  const filteredTeams = filterDivision === "all"
    ? teams
    : teams.filter((t) => t.division === filterDivision);

  const updateScore = (teamId: string, workoutId: string, value: string) => {
    setLocalScores((prev) => ({ ...prev, [`${teamId}::${workoutId}`]: value }));
  };

  const saveScores = async () => {
    for (const [key, val] of Object.entries(localWork)) {
      if (val === "") continue;
      const [, workout_id] = key.split("::");
      const target = workoutConfigMap[workout_id]?.target;
      if (target == null) continue;
      const n = Number(val);
      if (isNaN(n) || n < 0 || n > target) {
        toast.error(`Work completed must be between 0 and ${target}`);
        return;
      }
    }

    const upserts = Object.entries(localScores)
      .filter(([, val]) => val !== "" && !isNaN(Number(val)))
      .map(([key, val]) => {
        const [team_id, workout_id] = key.split("::");
        const scoringType = workoutScoringMap[workout_id] || "points";
        const numVal = Number(val);
        const rawField = getRawFieldKey(scoringType);

        return {
          competition_id: competitionId,
          team_id,
          workout_id,
          score: buildCanonicalScore(numVal, scoringType),
          judge_id: judgeId || null,
          [rawField]: numVal,
          work_completed:
            workoutConfigMap[workout_id]?.target != null && localWork[key]
              ? Number(localWork[key])
              : null,
          tie_breaker_seconds:
            workoutConfigMap[workout_id]?.tieBreaker && localTieBreak[key]
              ? Number(localTieBreak[key])
              : null,
        };
      });

    try {
      await upsertMutation.mutateAsync(upserts);
      toast.success("Scores saved!");
    } catch {
      toast.error("Failed to save scores");
    }
  };

  if (workouts.length === 0 || teams.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Scores</h3>
        </div>
        <p className="text-sm text-muted-foreground">Add teams and workouts first to enter scores.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Scores</h3>
        </div>
        <div className="flex items-center gap-2">
          {divisions.length > 1 && (
            <Select value={filterDivision} onValueChange={setFilterDivision}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="All Divisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canScore && (
            <Button size="sm" onClick={saveScores} disabled={upsertMutation.isPending}
              className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Save className="h-4 w-4 mr-1" />
              {upsertMutation.isPending ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-bold text-foreground uppercase text-xs">Team</th>
              {workouts.map((w) => {
                const st = normalizeScoringType(w.scoring_type);
                const Icon = SCORING_ICONS[st];
                return (
                  <th key={w.id} className="text-center py-2 px-2 font-bold text-foreground uppercase text-xs whitespace-nowrap">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="flex items-center gap-1">
                        WOD {w.workout_number}
                        {w.is_locked && <Lock className="inline h-3 w-3 text-destructive" />}
                      </span>
                      <span className="flex items-center gap-0.5 text-muted-foreground font-normal text-[10px]">
                        <Icon className="h-3 w-3" />
                        {SCORING_LABELS[st]}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((team) => (
              <tr key={team.id} className="border-b border-border/50">
                <td className="py-2 px-2 font-semibold text-foreground text-xs whitespace-nowrap">
                  {team.team_name}
                  {team.division && (
                    <span className="block text-[10px] text-muted-foreground font-normal">{team.division}</span>
                  )}
                </td>
                {workouts.map((w) => {
                  const key = `${team.id}::${w.id}`;
                  const isLocked = w.is_locked;
                  const st = normalizeScoringType(w.scoring_type);
                  return (
                    <td key={w.id} className="py-2 px-1 text-center">
                      {canScore && !isLocked ? (
                        st === "time" ? (
                          <div className="flex justify-center">
                            <TimeCaptureField
                              value={localScores[key] || "0"}
                              onChange={(v) => updateScore(team.id, w.id, v)}
                              size="sm"
                            />
                          </div>
                        ) : (
                          <Input
                            type="number"
                            value={localScores[key] || ""}
                            onChange={(e) => updateScore(team.id, w.id, e.target.value)}
                            placeholder={st === "load" ? "kg" : "0"}
                            className="h-7 w-20 mx-auto text-center text-xs bg-background"
                          />
                        )
                      ) : (
                        <span className="text-foreground font-medium text-xs">
                          {localScores[key]
                            ? st === "time"
                              ? formatSecondsDisplay(localScores[key])
                              : st === "load"
                              ? `${localScores[key]}kg`
                              : localScores[key]
                            : "—"}
                        </span>
                      )}
                      {canScore && !isLocked && (workoutConfigMap[w.id]?.target != null || workoutConfigMap[w.id]?.tieBreaker) && (
                        <div className="mt-1 flex flex-col items-center gap-1">
                          {workoutConfigMap[w.id]?.target != null && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={workoutConfigMap[w.id]!.target!}
                                value={localWork[key] ?? ""}
                                onChange={(e) => setLocalWork((p) => ({ ...p, [key]: e.target.value }))}
                                placeholder="0"
                                className="h-7 w-16 text-center text-xs bg-background"
                              />
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                / {workoutConfigMap[w.id]!.target} {workoutConfigMap[w.id]!.unit}
                              </span>
                            </div>
                          )}
                          {workoutConfigMap[w.id]?.tieBreaker && (
                            <div className="flex items-center gap-1">
                              <TimeCaptureField
                                value={localTieBreak[key] || "0"}
                                onChange={(v) => setLocalTieBreak((p) => ({ ...p, [key]: v }))}
                                size="sm"
                              />
                              <span className="text-[10px] text-muted-foreground">TB</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
