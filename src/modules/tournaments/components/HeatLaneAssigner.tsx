import { useMemo } from "react";
import { useHeatAssignments, useAssignTeamToHeat } from "@/modules/tournaments/hooks-engine";
import { removeHeatAssignment } from "@/modules/tournaments/api-engine";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Team } from "@/domain/competition";

interface HeatLaneAssignerProps {
  heatId: string;
  competitionId: string;
  laneCount: number;
  teams: Team[];
  canAdmin: boolean;
}

export function HeatLaneAssigner({ heatId, competitionId, laneCount, teams, canAdmin }: HeatLaneAssignerProps) {
  const { data: assignments = [], isLoading } = useHeatAssignments(heatId);
  const assignMutation = useAssignTeamToHeat();
  const qc = useQueryClient();

  // Build lane slots
  const lanes = useMemo(() => {
    const slots: { lane: number; assignment?: typeof assignments[0]; teamName?: string }[] = [];
    for (let i = 1; i <= laneCount; i++) {
      const a = assignments.find((a) => a.lane_number === i);
      const team = a ? teams.find((t) => t.id === a.team_id) : undefined;
      slots.push({ lane: i, assignment: a, teamName: team?.team_name });
    }
    return slots;
  }, [assignments, laneCount, teams]);

  const assignedTeamIds = new Set(assignments.map((a) => a.team_id));
  const availableTeams = teams.filter((t) => !assignedTeamIds.has(t.id));

  const handleAssign = async (lane: number, teamId: string) => {
    try {
      await assignMutation.mutateAsync({ heatId, teamId, laneNumber: lane });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeHeatAssignment(assignmentId);
      qc.invalidateQueries({ queryKey: ["heat-assignments", heatId] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading lanes…</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold text-foreground uppercase">Lane Assignments</span>
        <span className="text-xs text-muted-foreground ml-auto">{assignments.length}/{laneCount} filled</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {lanes.map(({ lane, assignment, teamName }) => (
          <div key={lane} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
              {lane}
            </div>

            {assignment ? (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{teamName || "Unknown"}</span>
                {canAdmin && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleRemove(assignment.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ) : canAdmin ? (
              <Select onValueChange={(teamId) => handleAssign(lane, teamId)}>
                <SelectTrigger className="h-7 text-xs bg-background border-dashed flex-1">
                  <span className="text-muted-foreground">Assign team…</span>
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.length === 0 ? (
                    <SelectItem value="_none" disabled>No teams available</SelectItem>
                  ) : (
                    availableTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-muted-foreground italic">Empty</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
