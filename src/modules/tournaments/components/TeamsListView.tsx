import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, Search, Copy, Check, UserPlus, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useTeams, useAddTeam, useRemoveTeam, useDivisions } from "@/modules/tournaments/hooks";
import { useRegistrations } from "@/modules/athletes/hooks";
import { useAuth } from "@/components/AuthProvider";
import type { Team } from "@/domain/competition";
import { ManageTeamMembersDialog } from "./ManageTeamMembersDialog";

interface Props {
  competitionId: string;
  canAdmin: boolean;
}

export function TeamsListView({ competitionId, canAdmin }: Props) {
  const { user } = useAuth();
  const { data: teams = [] } = useTeams(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const { data: registrations = [] } = useRegistrations(competitionId);
  const addTeam = useAddTeam();
  const removeTeam = useRemoveTeam();

  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDivisionId, setTeamDivisionId] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [manageTeam, setManageTeam] = useState<Team | null>(null);

  // Members per team
  const teamMembers = useMemo(() => {
    const map: Record<string, typeof registrations> = {};
    registrations.forEach((r) => {
      if (r.team_id) {
        if (!map[r.team_id]) map[r.team_id] = [];
        map[r.team_id].push(r);
      }
    });
    return map;
  }, [registrations]);

  // Only divisions that actually allow more than one athlete can hold a team
  const teamDivisions = useMemo(
    () => divisions.filter((d) => Number((d as any).team_size ?? 1) > 1),
    [divisions],
  );
  const soloDivisionIds = useMemo(
    () => new Set(divisions.filter((d) => Number((d as any).team_size ?? 1) <= 1).map((d) => d.id)),
    [divisions],
  );

  const visibleTeams = useMemo(
    () => teams.filter((t) => !t.division_id || !soloDivisionIds.has(t.division_id)),
    [teams, soloDivisionIds],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return visibleTeams;
    const q = search.toLowerCase();
    return visibleTeams.filter((t) => t.team_name.toLowerCase().includes(q));
  }, [visibleTeams, search]);

  const handleCreate = async () => {
    if (!teamName.trim()) { toast.error("Team name required"); return; }
    if (teamDivisions.length > 0 && !teamDivisionId) {
      toast.error("Select a team division");
      return;
    }
    const div = divisions.find((d) => d.id === teamDivisionId);
    try {
      await addTeam.mutateAsync({
        competition_id: competitionId,
        team_name: teamName.trim(),
        division: div?.name || null,
        division_id: teamDivisionId || null,
      });
      toast.success("Team created!");
      setTeamName(""); setTeamDivisionId(""); setShowCreate(false);
    } catch { toast.error("Failed to create team"); }
  };


  const handleDelete = async (team: Team) => {
    const members = teamMembers[team.id] || [];
    if (members.length > 0) {
      toast.error(`Remove ${members.length} member(s) first`);
      return;
    }
    try {
      await removeTeam.mutateAsync({ teamId: team.id, competitionId });
      toast.success("Team removed");
    } catch { toast.error("Failed to remove team"); }
  };

  const handleCopyInvite = async (team: Team) => {
    const code = (team as any).invite_code;
    if (!code) {
      toast.info("No invite code set for this team");
      return;
    }
    const link = `${window.location.origin}/event/${competitionId}?invite=${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(team.id);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Teams</h3>
          <Badge variant="secondary" className="text-[10px]">{visibleTeams.length}</Badge>
        </div>
        {canAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-1" /> Create Team
          </Button>
        )}
      </div>

      {/* Search */}
      {teams.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teams..." className="pl-9 h-9" />
        </div>
      )}

      {/* Team cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No teams yet</p>
          {canAdmin && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create First Team
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((team) => {
            const members = teamMembers[team.id] || [];
            const divName = divisions.find((d) => d.id === team.division_id)?.name;
            const isComplete = (team as any).is_complete;

            return (
              <div key={team.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{team.team_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {divName && <Badge variant="outline" className="text-[10px]">{divName}</Badge>}
                      <Badge variant={isComplete ? "default" : "secondary"} className="text-[10px]">
                        {isComplete ? "Complete" : "Incomplete"}
                      </Badge>
                    </div>
                  </div>
                  {canAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        title="Manage members"
                        aria-label="Manage members"
                        onClick={() => setManageTeam(team)}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                      {(team as any).invite_code && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyInvite(team)} aria-label="Copy invite link">
                          {copiedId === team.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(team)} aria-label="Delete team">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Members list */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Members ({members.length})
                    </p>
                    {canAdmin && (
                      <button
                        type="button"
                        onClick={() => setManageTeam(team)}
                        className="text-[10px] font-semibold text-primary hover:underline uppercase tracking-wider"
                      >
                        + Add / Manage
                      </button>
                    )}
                  </div>
                  {members.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No members assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {members.slice(0, 6).map((m) => (
                        <Badge key={m.id} variant="outline" className="text-[10px] font-normal">
                          {m.athlete_name}
                        </Badge>
                      ))}
                      {members.length > 6 && (
                        <Badge variant="secondary" className="text-[10px]">+{members.length - 6}</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manage members dialog */}
      <ManageTeamMembersDialog
        open={!!manageTeam}
        onOpenChange={(open) => !open && setManageTeam(null)}
        team={manageTeam}
        competitionId={competitionId}
      />

      {/* Create Team Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Team</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium">Team Name *</Label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Team Alpha" className="mt-1" maxLength={100} onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            </div>
            {divisions.length > 0 && (
              <div>
                <Label className="text-xs font-medium">Division</Label>
                <Select value={teamDivisionId || "__none__"} onValueChange={(v) => setTeamDivisionId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Division</SelectItem>
                    {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleCreate} disabled={!teamName.trim() || addTeam.isPending} className="w-full bg-accent text-accent-foreground">
              <Plus className="h-4 w-4 mr-1" /> Create Team
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
