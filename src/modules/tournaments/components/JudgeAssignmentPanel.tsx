import { useState, useMemo } from "react";
import { useJudges } from "@/modules/admin/hooks";
import { useJudgeAssignments, useAssignJudge, useHeats } from "@/modules/tournaments/hooks-engine";
import { useWorkouts } from "@/modules/tournaments/hooks";
import { removeJudgeAssignment } from "@/modules/tournaments/api-engine";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gavel, Plus, X, Users, Flame, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface JudgeAssignmentPanelProps {
  competitionId: string;
  canAdmin: boolean;
}

export function JudgeAssignmentPanel({ competitionId, canAdmin }: JudgeAssignmentPanelProps) {
  const { data: judges = [] } = useJudges(competitionId);
  const { data: assignments = [], isLoading } = useJudgeAssignments(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: heats = [] } = useHeats(competitionId);
  const assignMutation = useAssignJudge();
  const qc = useQueryClient();

  const [selectedJudge, setSelectedJudge] = useState("");
  const [selectedWorkout, setSelectedWorkout] = useState("");
  const [selectedHeat, setSelectedHeat] = useState("");
  const [laneNumber, setLaneNumber] = useState("");

  const workoutMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of workouts) m.set(w.id, w.name || `WOD #${w.workout_number}`);
    return m;
  }, [workouts]);

  const heatMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of heats) {
      const wName = h.workout_id ? workoutMap.get(h.workout_id) || "" : "";
      m.set(h.id, `${wName} – Heat #${h.heat_number}`);
    }
    return m;
  }, [heats, workoutMap]);

  // Filter heats by selected workout
  const filteredHeats = useMemo(() => {
    if (!selectedWorkout) return heats;
    return heats.filter((h) => h.workout_id === selectedWorkout);
  }, [heats, selectedWorkout]);

  const handleAssign = async () => {
    if (!selectedJudge) {
      toast.error("Select a judge");
      return;
    }
    try {
      await assignMutation.mutateAsync({
        competition_id: competitionId,
        judge_id: selectedJudge,
        workout_id: selectedWorkout || null,
        heat_id: selectedHeat || null,
        lane_number: laneNumber ? parseInt(laneNumber) : null,
      });
      toast.success("Judge assigned");
      setSelectedJudge("");
      setSelectedHeat("");
      setLaneNumber("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeJudgeAssignment(assignmentId);
      qc.invalidateQueries({ queryKey: ["judge-assignments", competitionId] });
      toast.success("Assignment removed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm py-8 text-center">Loading assignments…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Assignment form */}
      {canAdmin && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Assign Judge</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Judge</Label>
              <Select value={selectedJudge} onValueChange={setSelectedJudge}>
                <SelectTrigger className="h-9 bg-background text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {judges.length === 0 ? (
                    <SelectItem value="_none" disabled>No judges added</SelectItem>
                  ) : (
                    judges.map((j) => (
                      <SelectItem key={j.id} value={j.user_id}>
                        {j.user_id.slice(0, 8)}…
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Workout (optional)</Label>
              <Select value={selectedWorkout} onValueChange={(v) => { setSelectedWorkout(v); setSelectedHeat(""); }}>
                <SelectTrigger className="h-9 bg-background text-sm"><SelectValue placeholder="All workouts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Workouts</SelectItem>
                  {workouts.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name || `WOD #${w.workout_number}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Heat (optional)</Label>
              <Select value={selectedHeat} onValueChange={setSelectedHeat}>
                <SelectTrigger className="h-9 bg-background text-sm"><SelectValue placeholder="All heats" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Heats</SelectItem>
                  {filteredHeats.map((h) => (
                    <SelectItem key={h.id} value={h.id}>Heat #{h.heat_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Lane #</Label>
              <Input type="number" value={laneNumber} onChange={(e) => setLaneNumber(e.target.value)}
                placeholder="Any" className="h-9 bg-background text-sm" min={1} max={50} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAssign} disabled={assignMutation.isPending || !selectedJudge}
                className="h-9 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold w-full">
                <Plus className="h-4 w-4 mr-1" /> Assign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Current assignments */}
      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <Gavel className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No judge assignments yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Current Assignments</h3>
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Gavel className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      Judge {a.judge_id.slice(0, 8)}…
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.workout_id && (
                        <Badge variant="outline" className="text-xs">
                          <Flame className="h-3 w-3 mr-1" />
                          {workoutMap.get(a.workout_id) || "Workout"}
                        </Badge>
                      )}
                      {a.heat_id && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {heatMap.get(a.heat_id) || "Heat"}
                        </Badge>
                      )}
                      {a.lane_number && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          Lane {a.lane_number}
                        </Badge>
                      )}
                      {!a.workout_id && !a.heat_id && !a.lane_number && (
                        <span className="text-xs text-muted-foreground">All workouts & heats</span>
                      )}
                    </div>
                  </div>
                </div>
                {canAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleRemove(a.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
