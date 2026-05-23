import { useState, useMemo, useEffect } from "react";
import { useHeats, useAddHeat, useUpdateHeatStatus, useAllHeatAssignments } from "@/modules/tournaments/hooks-engine";
import { useTeams, useWorkouts } from "@/modules/tournaments/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, CheckCircle2, Clock, Users, Flame, Lock, Gavel, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeatLaneAssigner } from "./HeatLaneAssigner";
import { AutoHeatGenerator } from "./AutoHeatGenerator";
import { getWorkoutColor } from "@/lib/workoutColors";
import { fetchJudges } from "@/data/judges";
import { fetchHeatJudges, assignHeatJudge, unassignHeatJudge } from "@/data/heatJudges";

interface HeatManagementPanelProps {
  competitionId: string;
  canAdmin: boolean;
}

const HEAT_STATUSES = [
  { value: "pending", label: "Scheduled", icon: Clock, color: "bg-muted text-muted-foreground" },
  { value: "ready", label: "Ready", icon: CheckCircle2, color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" },
  { value: "active", label: "Active", icon: Play, color: "bg-primary/20 text-primary" },
  { value: "completed", label: "Complete", icon: CheckCircle2, color: "bg-accent/20 text-accent-foreground" },
  { value: "locked", label: "Locked", icon: Lock, color: "bg-destructive/20 text-destructive" },
];

export function HeatManagementPanel({ competitionId, canAdmin }: HeatManagementPanelProps) {
  const { data: heats = [], isLoading } = useHeats(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: teams = [] } = useTeams(competitionId);
  const { data: allAssignments = [] } = useAllHeatAssignments(competitionId);
  const addHeatMutation = useAddHeat();
  const updateStatusMutation = useUpdateHeatStatus();
  const qc = useQueryClient();

  const { data: judges = [] } = useQuery({
    queryKey: ["judges", competitionId],
    queryFn: () => fetchJudges(competitionId),
  });
  const { data: heatJudges = [] } = useQuery({
    queryKey: ["heat-judges", competitionId],
    queryFn: () => fetchHeatJudges(competitionId),
  });
  const heatJudgesByHeat = useMemo(() => {
    const m = new Map<string, typeof heatJudges>();
    for (const hj of heatJudges) {
      if (!m.has(hj.heat_id)) m.set(hj.heat_id, []);
      m.get(hj.heat_id)!.push(hj);
    }
    return m;
  }, [heatJudges]);

  const judgeLabel = (j: { user_id: string | null; display_name?: string | null }) =>
    j.display_name?.trim() || (j.user_id ? `${j.user_id.slice(0, 6)}…` : "Unnamed");

  const handleAssignJudge = async (heatId: string, judgeId: string) => {
    try {
      await assignHeatJudge(heatId, judgeId);
      qc.invalidateQueries({ queryKey: ["heat-judges", competitionId] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  const handleUnassignJudge = async (id: string) => {
    try {
      await unassignHeatJudge(id);
      qc.invalidateQueries({ queryKey: ["heat-judges", competitionId] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [laneCount, setLaneCount] = useState("10");
  const [scheduledStart, setScheduledStart] = useState("");
  const [expandedHeatId, setExpandedHeatId] = useState<string | null>(null);

  const heatsByWorkout = useMemo(() => {
    const map = new Map<string, typeof heats>();
    for (const h of heats) {
      const key = h.workout_id || "_unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    }
    return map;
  }, [heats]);

  // Map workout_id → set of team IDs already placed in any of its heats
  const teamsAssignedByWorkout = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const heatToWorkout = new Map(heats.map((h) => [h.id, h.workout_id]));
    for (const a of allAssignments) {
      const wid = heatToWorkout.get(a.heat_id);
      if (!wid) continue;
      if (!map.has(wid)) map.set(wid, new Set());
      map.get(wid)!.add(a.team_id);
    }
    return map;
  }, [allAssignments, heats]);

  const workoutMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of workouts) m.set(w.id, w.name || `WOD #${w.workout_number}`);
    return m;
  }, [workouts]);

  // Remember the last scheduled start across heat creations so users don't
  // have to re-enter the date/time for each consecutive heat.
  // Pre-fill with the latest heat's scheduled_start for the selected workout.
  useEffect(() => {
    if (scheduledStart) return;
    if (!selectedWorkoutId) return;
    const workoutHeats = heats
      .filter((h) => h.workout_id === selectedWorkoutId && h.scheduled_start)
      .sort(
        (a, b) =>
          new Date(b.scheduled_start as string).getTime() -
          new Date(a.scheduled_start as string).getTime(),
      );
    const latest = workoutHeats[0]?.scheduled_start;
    if (latest) {
      // Convert ISO → "YYYY-MM-DDTHH:mm" for datetime-local
      const d = new Date(latest);
      const pad = (n: number) => String(n).padStart(2, "0");
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setScheduledStart(local);
    }
  }, [selectedWorkoutId, heats, scheduledStart]);

  const handleAddHeat = async () => {
    if (!selectedWorkoutId) {
      toast.error("Select a workout first");
      return;
    }
    const workoutHeats = heats.filter((h) => h.workout_id === selectedWorkoutId);
    const nextNumber = workoutHeats.length + 1;

    try {
      await addHeatMutation.mutateAsync({
        competition_id: competitionId,
        workout_id: selectedWorkoutId,
        heat_number: nextNumber,
        lane_count: parseInt(laneCount) || 10,
        scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : undefined,
      });
      toast.success(`Heat #${nextNumber} created`);
      // Keep the scheduledStart value so the next heat reuses the same time
      // (the admin can simply bump the time as needed).
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleStatusChange = async (heatId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ heatId, status: newStatus, competitionId });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const getStatusConfig = (status: string) =>
    HEAT_STATUSES.find((s) => s.value === status) || HEAT_STATUSES[0];

  if (isLoading) {
    return <div className="text-muted-foreground text-sm py-8 text-center">Loading heats…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Auto heat generator */}
      {canAdmin && <AutoHeatGenerator competitionId={competitionId} />}

      {/* Manual create heat form */}
      {canAdmin && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Add Heat Manually</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Workout</Label>
              <Select value={selectedWorkoutId} onValueChange={setSelectedWorkoutId}>
                <SelectTrigger className="h-9 bg-background text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {workouts.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name || `WOD #${w.workout_number}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Lanes</Label>
              <Input type="number" value={laneCount} onChange={(e) => setLaneCount(e.target.value)}
                className="h-9 bg-background text-sm" min={1} max={50} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start Time</Label>
              <Input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)}
                className="h-9 bg-background text-sm" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddHeat} disabled={addHeatMutation.isPending || !selectedWorkoutId}
                className="h-9 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold w-full">
                <Plus className="h-4 w-4 mr-1" /> Add Heat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Heats grouped by workout */}
      {heats.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No heats scheduled yet.</p>
          {canAdmin && teams.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">Use Auto-Generate above to create heats from your teams.</p>
          )}
        </div>
      ) : (
        Array.from(heatsByWorkout.entries()).map(([workoutId, workoutHeats]) => {
          const color = getWorkoutColor(workoutId === "_unassigned" ? null : workoutId);
          return (
          <div key={workoutId} className="space-y-3">
            <h3
              className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 pl-3 border-l-4"
              style={{ borderColor: color.solid, color: color.text }}
            >
              {workoutId === "_unassigned" ? "Unassigned" : workoutMap.get(workoutId) || "Unknown Workout"}
              <Badge
                variant="outline"
                className="text-[10px] border-transparent"
                style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
              >
                {workoutHeats.length} heats
              </Badge>
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {workoutHeats.map((heat) => {
                const sc = getStatusConfig(heat.status);
                const isExpanded = expandedHeatId === heat.id;
                return (
                  <div
                    key={heat.id}
                    className="bg-card border rounded-xl overflow-hidden"
                    style={{ borderColor: color.border }}
                  >
                    <button
                      onClick={() => setExpandedHeatId(isExpanded ? null : heat.id)}
                      className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/30 transition-colors border-l-4"
                      style={{ borderLeftColor: color.solid }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm"
                          style={{
                            backgroundColor: heat.status === "active" ? color.solid : color.bg,
                            color: heat.status === "active" ? "#fff" : color.text,
                          }}
                        >
                          {heat.heat_number}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">Heat #{heat.heat_number}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{heat.lane_count} lanes</span>
                            {heat.scheduled_start && (
                              <>
                                <Clock className="h-3 w-3 ml-1" />
                                <span>{new Date(heat.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canAdmin ? (
                          <Select value={heat.status} onValueChange={(v) => handleStatusChange(heat.id, v)}>
                            <SelectTrigger className={`h-7 text-xs font-semibold px-2 border-none ${sc.color}`} onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HEAT_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={sc.color}>{sc.label}</Badge>
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-4">
                        {/* Heat judges */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Gavel className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-foreground uppercase">Judges on this heat</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(heatJudgesByHeat.get(heat.id) ?? []).length === 0 && (
                              <span className="text-xs text-muted-foreground italic">No judges assigned</span>
                            )}
                            {(heatJudgesByHeat.get(heat.id) ?? []).map((hj) => {
                              const j = judges.find((x) => x.id === hj.judge_id);
                              return (
                                <Badge key={hj.id} variant="outline" className="text-[11px] gap-1 pr-1">
                                  {j ? judgeLabel(j) : hj.display_name || "Judge"}
                                  {canAdmin && (
                                    <button
                                      onClick={() => handleUnassignJudge(hj.id)}
                                      className="rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                                      aria-label="Remove judge"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </Badge>
                              );
                            })}
                          </div>
                          {canAdmin && (() => {
                            const assignedIds = new Set((heatJudgesByHeat.get(heat.id) ?? []).map((x) => x.judge_id));
                            const available = judges.filter((j) => !assignedIds.has(j.id));
                            return (
                              <Select onValueChange={(v) => handleAssignJudge(heat.id, v)}>
                                <SelectTrigger className="h-8 text-xs bg-background w-56">
                                  <SelectValue placeholder="Assign judge…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {available.length === 0 ? (
                                    <SelectItem value="_none" disabled>No judges available</SelectItem>
                                  ) : (
                                    available.map((j) => (
                                      <SelectItem key={j.id} value={j.id}>
                                        {judgeLabel(j)}
                                        {!j.user_id && <span className="ml-1 text-[9px] text-muted-foreground uppercase">guest</span>}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            );
                          })()}
                        </div>

                        <HeatLaneAssigner
                          heatId={heat.id}
                          competitionId={competitionId}
                          laneCount={heat.lane_count}
                          teams={teams}
                          canAdmin={canAdmin}
                          excludeTeamIds={heat.workout_id ? teamsAssignedByWorkout.get(heat.workout_id) : undefined}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })
      )}
    </div>
  );
}
