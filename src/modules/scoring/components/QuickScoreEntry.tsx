import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Save, Award, Flame, Users } from "lucide-react";
import { toast } from "sonner";
import { useWorkouts, useTeams } from "@/modules/tournaments/hooks";
import { useHeats, useHeatAssignments } from "@/modules/tournaments/hooks-engine";
import { useScores, useUpsertScores } from "@/modules/scoring/hooks";

interface QuickScoreEntryProps {
  competitionId: string;
  canScore: boolean;
  judgeId?: string;
}

export function QuickScoreEntry({ competitionId, canScore, judgeId }: QuickScoreEntryProps) {
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: teams = [] } = useTeams(competitionId);
  const { data: heats = [] } = useHeats(competitionId);
  const { data: scoreRows = [] } = useScores(competitionId);
  const upsertMutation = useUpsertScores();

  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [selectedHeatId, setSelectedHeatId] = useState<string>("");
  const [localScores, setLocalScores] = useState<Record<string, string>>({});

  // Filter heats by selected workout
  const workoutHeats = useMemo(() => {
    if (!selectedWorkoutId) return [];
    return heats.filter((h) => h.workout_id === selectedWorkoutId);
  }, [heats, selectedWorkoutId]);

  // Auto-select first heat when workout changes
  useEffect(() => {
    if (workoutHeats.length > 0 && !workoutHeats.find((h) => h.id === selectedHeatId)) {
      setSelectedHeatId(workoutHeats[0].id);
    } else if (workoutHeats.length === 0) {
      setSelectedHeatId("");
    }
  }, [workoutHeats, selectedHeatId]);

  // Auto-select first workout
  useEffect(() => {
    if (workouts.length > 0 && !selectedWorkoutId) {
      setSelectedWorkoutId(workouts[0].id);
    }
  }, [workouts, selectedWorkoutId]);

  // Get teams for the selected heat (or all teams if no heats)
  const { data: heatAssignments = [] } = useHeatAssignments(selectedHeatId || undefined);

  const displayTeams = useMemo(() => {
    if (selectedHeatId && heatAssignments.length > 0) {
      return heatAssignments
        .map((ha) => {
          const team = teams.find((t) => t.id === ha.team_id);
          return team ? { ...team, lane: ha.lane_number } : null;
        })
        .filter(Boolean)
        .sort((a, b) => (a!.lane || 0) - (b!.lane || 0)) as (typeof teams[0] & { lane?: number | null })[];
    }
    // No heats — show all teams
    return teams.map((t) => ({ ...t, lane: null }));
  }, [selectedHeatId, heatAssignments, teams]);

  // Sync existing scores into local state
  useEffect(() => {
    if (!selectedWorkoutId) return;
    const map: Record<string, string> = {};
    scoreRows.forEach((s) => {
      if (s.workout_id === selectedWorkoutId) {
        const val = s.points_awarded != null ? String(s.points_awarded) : String(s.score);
        map[s.team_id] = val;
      }
    });
    setLocalScores(map);
  }, [scoreRows, selectedWorkoutId]);

  const updateScore = (teamId: string, value: string) => {
    setLocalScores((prev) => ({ ...prev, [teamId]: value }));
  };

  const handleSave = async () => {
    if (!selectedWorkoutId) return;

    const upserts = Object.entries(localScores)
      .filter(([, val]) => val !== "" && !isNaN(Number(val)))
      .map(([team_id, val]) => ({
        competition_id: competitionId,
        team_id,
        workout_id: selectedWorkoutId,
        score: Number(val),
        judge_id: judgeId || null,
        points_awarded: Number(val),
        heat_id: selectedHeatId || null,
      }));

    try {
      await upsertMutation.mutateAsync(upserts as any);
      toast.success("Scores saved!");
    } catch {
      toast.error("Failed to save scores");
    }
  };

  if (workouts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Add workouts first to enter scores.</p>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Add teams first to enter scores.</p>
      </div>
    );
  }

  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId);

  return (
    <div className="space-y-4">
      {/* Workout & Heat selector */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Workout</label>
            <Select value={selectedWorkoutId} onValueChange={setSelectedWorkoutId}>
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Select workout" />
              </SelectTrigger>
              <SelectContent>
                {workouts.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name || `WOD ${w.workout_number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {workoutHeats.length > 0 && (
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Heat</label>
              <Select value={selectedHeatId} onValueChange={setSelectedHeatId}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Select heat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Teams</SelectItem>
                  {workoutHeats.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      Heat #{h.heat_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {canScore && (
            <div className="flex items-end">
              <Button onClick={handleSave} disabled={upsertMutation.isPending}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-10">
                <Save className="h-4 w-4 mr-1" />
                {upsertMutation.isPending ? "Saving…" : "Save Scores"}
              </Button>
            </div>
          )}
        </div>

        {selectedWorkout && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Award className="h-3 w-3 mr-1" /> Points Only
            </Badge>
            {selectedWorkout.name && (
              <span className="text-xs text-muted-foreground">{selectedWorkout.name}</span>
            )}
          </div>
        )}
      </div>

      {/* Score entry grid */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-primary/5 px-4 py-3 border-b border-border flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase">
            Enter Points — {selectedWorkout?.name || `WOD ${selectedWorkout?.workout_number}`}
          </h3>
          {selectedHeatId && workoutHeats.length > 0 && (
            <Badge variant="outline" className="text-xs ml-auto">
              <Flame className="h-3 w-3 mr-1" />
              Heat #{workoutHeats.find((h) => h.id === selectedHeatId)?.heat_number}
            </Badge>
          )}
        </div>

        <div className="divide-y divide-border">
          {displayTeams.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {selectedHeatId ? "No teams assigned to this heat." : "No teams found."}
              </p>
            </div>
          ) : (
            displayTeams.map((team) => (
              <div key={team.id} className="flex items-center gap-4 px-4 py-3">
                {team.lane != null && (
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    L{team.lane}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{team.team_name}</p>
                  {team.division && (
                    <p className="text-[10px] text-muted-foreground">{team.division}</p>
                  )}
                </div>
                {canScore ? (
                  <Input
                    type="number"
                    min={0}
                    value={localScores[team.id] || ""}
                    onChange={(e) => updateScore(team.id, e.target.value)}
                    placeholder="0"
                    className="h-10 w-24 text-center text-sm bg-background font-bold"
                  />
                ) : (
                  <span className="text-lg font-black text-primary tabular-nums w-24 text-center">
                    {localScores[team.id] || "—"}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
