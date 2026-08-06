import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, UserPlus, X, ArrowRightLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useRegistrations, useUpdateRegistrationTeam } from "@/modules/athletes/hooks";
import { useTeams, useDivisions, useUpdateTeam } from "@/modules/tournaments/hooks";
import type { Team } from "@/domain/competition";

interface ManageTeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  competitionId: string;
}

export function ManageTeamMembersDialog({
  open,
  onOpenChange,
  team,
  competitionId,
}: ManageTeamMembersDialogProps) {
  const { data: registrations = [] } = useRegistrations(competitionId);
  const { data: teams = [] } = useTeams(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const updateTeam = useUpdateRegistrationTeam();
  const updateTeamMeta = useUpdateTeam();
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");

  const teamNameById = useMemo(() => {
    const m: Record<string, string> = {};
    teams.forEach((t) => (m[t.id] = t.team_name));
    return m;
  }, [teams]);

  const currentMembers = useMemo(
    () => registrations.filter((r) => r.team_id === team?.id),
    [registrations, team?.id],
  );

  // Team size comes from the team's division (defaults to 1 = solo)
  const teamSize = useMemo(() => {
    const div = divisions.find((d) => d.id === team?.division_id);
    return Math.max(1, Number((div as any)?.team_size ?? 1));
  }, [divisions, team?.division_id]);

  const isFull = currentMembers.length >= teamSize;

  const availableAthletes = useMemo(() => {
    let list = registrations.filter((r) => r.team_id !== team?.id);
    // Exclude rejected / removed / withdrawn
    list = list.filter(
      (r) => !["rejected", "removed", "withdrawn"].includes(r.status),
    );
    if (genderFilter !== "all") {
      list = list.filter((r) => (r.gender ?? "").toLowerCase() === genderFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.athlete_name.toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q),
      );
    }
    // Sort: unassigned first, then by name
    return list.sort((a, b) => {
      const aUn = a.team_id ? 1 : 0;
      const bUn = b.team_id ? 1 : 0;
      if (aUn !== bUn) return aUn - bUn;
      return a.athlete_name.localeCompare(b.athlete_name);
    });
  }, [registrations, team?.id, search, genderFilter]);

  if (!team) return null;


  const handleAdd = async (regId: string, currentTeamId: string | null) => {
    if (isFull) {
      toast.error(`${team.team_name} is full (${teamSize} ${teamSize === 1 ? "athlete" : "athletes"})`);
      return;
    }

    try {
      await updateTeam.mutateAsync({
        id: regId,
        teamId: team.id,
        competitionId,
      });
      toast.success(
        currentTeamId
          ? `Moved to ${team.team_name}`
          : `Added to ${team.team_name}`,
      );
    } catch {
      toast.error("Failed to assign athlete");
    }
  };

  const handleRemove = async (regId: string, name: string) => {
    try {
      await updateTeam.mutateAsync({
        id: regId,
        teamId: null,
        competitionId,
      });
      toast.success(`${name} returned to athletes list`);
    } catch {
      toast.error("Failed to remove member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {team.team_name}
          </DialogTitle>
          <DialogDescription>
            Manage members for this team. Removed members return to the Athletes
            list as unassigned.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Division assignment */}
          {divisions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Division
              </p>
              <Select
                value={team.division_id || "__none__"}
                onValueChange={async (v) => {
                  const newDivId = v === "__none__" ? null : v;
                  const divName = divisions.find((d) => d.id === newDivId)?.name || null;
                  try {
                    await updateTeamMeta.mutateAsync({
                      teamId: team.id,
                      competitionId,
                      updates: { division_id: newDivId, division: divName },
                    });
                    toast.success(newDivId ? `Division set to ${divName}` : "Division removed");
                  } catch {
                    toast.error("Failed to update division");
                  }
                }}
                disabled={updateTeamMeta.isPending}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="No Division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Division</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Current members */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Current members ({currentMembers.length})
            </p>
            {currentMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-2">
                No members yet — add some below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {currentMembers.map((m) => (
                  <Badge
                    key={m.id}
                    variant="secondary"
                    className="text-xs gap-1 pr-1 py-1"
                  >
                    {m.athlete_name}
                    <button
                      type="button"
                      onClick={() => handleRemove(m.id, m.athlete_name)}
                      className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                      aria-label={`Remove ${m.athlete_name}`}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Add members section */}
          <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Add athletes
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="pl-9 h-9"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-border rounded-lg divide-y divide-border">
              {availableAthletes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 px-3">
                  {search
                    ? "No matching athletes"
                    : "No other athletes registered yet"}
                </p>
              ) : (
                availableAthletes.map((r) => {
                  const currentTeamName = r.team_id
                    ? teamNameById[r.team_id]
                    : null;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.athlete_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {currentTeamName ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] gap-1"
                            >
                              <ArrowRightLeft className="h-2.5 w-2.5" />
                              {currentTeamName}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              Unassigned
                            </Badge>
                          )}
                          {r.email && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {r.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={currentTeamName ? "outline" : "default"}
                        className="shrink-0 h-7 text-xs"
                        onClick={() => handleAdd(r.id, r.team_id)}
                        disabled={updateTeam.isPending}
                      >
                        {currentTeamName ? (
                          <>
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            Move
                          </>
                        ) : (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
