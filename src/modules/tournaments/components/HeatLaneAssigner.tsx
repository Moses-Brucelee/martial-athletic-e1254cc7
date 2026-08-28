import { useMemo } from "react";
import { useHeatAssignments, useAssignTeamToHeat, useAssignAthleteToHeat } from "@/modules/tournaments/hooks-engine";
import { removeHeatAssignment } from "@/modules/tournaments/api-engine";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, Users } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useRegistrations } from "@/modules/athletes/hooks";
import type { Team } from "@/domain/competition";

interface DivisionGroup {
  label: string;
  teams: Team[];
}

interface HeatLaneAssignerProps {
  heatId: string;
  competitionId: string;
  laneCount: number;
  teams: Team[];
  canAdmin: boolean;
  /** Team IDs already assigned to other heats in the same workout — they are hidden from the dropdown. */
  excludeTeamIds?: Set<string>;
}

export function HeatLaneAssigner({ heatId, competitionId, laneCount, teams, canAdmin, excludeTeamIds }: HeatLaneAssignerProps) {
  const { data: assignments = [], isLoading } = useHeatAssignments(heatId);
  const { data: registrations = [] } = useRegistrations(competitionId);
  const assignMutation = useAssignTeamToHeat();
  const assignAthleteMutation = useAssignAthleteToHeat();
  const qc = useQueryClient();

  const regById = useMemo(() => {
    const m = new Map<string, (typeof registrations)[number]>();
    for (const r of registrations) m.set(r.id, r);
    return m;
  }, [registrations]);

  // Build lane slots
  const lanes = useMemo(() => {
    const slots: { lane: number; assignment?: typeof assignments[0]; teamName?: string }[] = [];
    for (let i = 1; i <= laneCount; i++) {
      const a = assignments.find((a) => a.lane_number === i);
      const team = a?.team_id ? teams.find((t) => t.id === a.team_id) : undefined;
      const athlete = (a as any)?.athlete_registration_id
        ? regById.get((a as any).athlete_registration_id)
        : undefined;
      slots.push({ lane: i, assignment: a, teamName: team?.team_name || athlete?.athlete_name });
    }
    return slots;
  }, [assignments, laneCount, teams, regById]);

  const assignedTeamIds = new Set(assignments.map((a) => a.team_id).filter(Boolean) as string[]);
  const assignedAthleteIds = new Set(
    assignments.map((a) => (a as any).athlete_registration_id).filter(Boolean) as string[],
  );
  const availableTeams = teams.filter(
    (t) => !assignedTeamIds.has(t.id) && !(excludeTeamIds?.has(t.id))
  );

  /** Group available teams by their assigned division. Unassigned teams fall under a single fallback group. */
  const groupedTeams = useMemo((): DivisionGroup[] => {
    const map = new Map<string, Team[]>();
    for (const t of availableTeams) {
      const key = t.division?.trim() || "__unassigned__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }

    const groups: DivisionGroup[] = [];
    const unassigned = map.get("__unassigned__");

    for (const [key, groupTeams] of map) {
      if (key === "__unassigned__") continue;
      groups.push({ label: key, teams: groupTeams });
    }

    groups.sort((a, b) => a.label.localeCompare(b.label));

    if (unassigned && unassigned.length > 0) {
      groups.push({ label: "Other / Unassigned", teams: unassigned });
    }

    return groups;
  }, [availableTeams]);

  // Get approved athletes per team for display
  const approvedRegs = useMemo(
    () => registrations.filter((r) => r.status === "approved" || r.status === "confirmed"),
    [registrations]
  );

  /** Solo athletes: approved registrations with no team — can occupy a lane directly. */
  const availableSoloAthletes = useMemo(
    () => approvedRegs.filter((r) => !r.team_id && !assignedAthleteIds.has(r.id)),
    [approvedRegs, assignedAthleteIds],
  );

  const getTeamAthletes = (teamId: string) =>
    approvedRegs.filter((r) => r.team_id === teamId).map((r) => r.athlete_name);

  const filledCount = assignments.length;
  const fillPct = laneCount > 0 ? Math.round((filledCount / laneCount) * 100) : 0;

  const handleAssign = async (lane: number, value: string) => {
    try {
      if (value.startsWith("ath::")) {
        await assignAthleteMutation.mutateAsync({
          heatId,
          registrationId: value.slice(5),
          laneNumber: lane,
        });
      } else {
        await assignMutation.mutateAsync({ heatId, teamId: value.replace(/^team::/, ""), laneNumber: lane });
      }
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground uppercase">Lane Assignments</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filledCount}/{laneCount} filled</span>
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${fillPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {lanes.map(({ lane, assignment, teamName }) => {
          const athletes = assignment?.team_id ? getTeamAthletes(assignment.team_id) : [];
          const isSolo = !!(assignment as any)?.athlete_registration_id;

          return (
            <div key={lane} className={`flex items-start gap-2 p-2.5 rounded-lg border transition-colors ${
              assignment ? "bg-primary/5 border-primary/20" : "bg-background border-border border-dashed"
            }`}>
              <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
                {lane}
              </div>

              {assignment ? (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {teamName || "Unknown"}
                      {isSolo && (
                        <Badge variant="outline" className="ml-1.5 text-[9px] h-4 px-1.5 align-middle">
                          Solo
                        </Badge>
                      )}
                    </span>
                    {canAdmin && (

                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemove(assignment.id)} aria-label="Remove heat assignment">
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {athletes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {athletes.slice(0, 3).map((name, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] h-4 px-1.5 bg-background">
                          {name}
                        </Badge>
                      ))}
                      {athletes.length > 3 && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                          +{athletes.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ) : canAdmin ? (
                <Select onValueChange={(value) => handleAssign(lane, value)}>
                  <SelectTrigger className="h-7 text-xs bg-background border-dashed flex-1">
                    <span className="text-muted-foreground">Assign team or athlete…</span>
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams.length === 0 && availableSoloAthletes.length === 0 ? (
                      <SelectItem value="_none" disabled>Nobody available</SelectItem>
                    ) : (
                      <>
                        {availableTeams.map((t) => {
                          const tAthletes = getTeamAthletes(t.id);
                          return (
                            <SelectItem key={t.id} value={`team::${t.id}`}>
                              <div className="flex items-center gap-2">
                                <span>{t.team_name}</span>
                                {tAthletes.length > 0 && (
                                  <span className="text-muted-foreground text-[10px]">
                                    ({tAthletes.length} athletes)
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                        {availableSoloAthletes.map((r) => (
                          <SelectItem key={r.id} value={`ath::${r.id}`}>
                            <div className="flex items-center gap-2">
                              <span>{r.athlete_name}</span>
                              <span className="text-muted-foreground text-[10px]">(solo)</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>

              ) : (
                <span className="text-xs text-muted-foreground italic">Empty</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
