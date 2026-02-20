import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, UserPlus, Users2 } from "lucide-react";
import { toast } from "sonner";
import { fetchParticipants, addParticipant, removeParticipant, selfRegister } from "@/data/participants";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import type { Participant, Team } from "@/domain/competition";

interface ParticipantsPanelProps {
  competitionId: string;
  teams: Team[];
  canAdmin: boolean;
}

export function ParticipantsPanel({ competitionId, teams, canAdmin }: ParticipantsPanelProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newName, setNewName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchParticipants(competitionId).then(setParticipants).catch(() => {});
  }, [competitionId]);

  const isRegistered = participants.some((p) => p.user_id === user?.id);

  const handleAdd = async () => {
    if (!newName.trim() || !selectedTeamId) return;
    setAdding(true);
    try {
      const p = await addParticipant(competitionId, selectedTeamId, newName.trim());
      setParticipants((prev) => [...prev, p]);
      setNewName("");
      toast.success("Athlete added");
    } catch {
      toast.error("Failed to add athlete");
    }
    setAdding(false);
  };

  const handleSelfRegister = async (teamId: string) => {
    if (!user || !profile) return;
    setAdding(true);
    try {
      const p = await selfRegister(competitionId, teamId, user.id, profile.display_name || "Athlete");
      setParticipants((prev) => [...prev, p]);
      toast.success("You've joined the team!");
    } catch {
      toast.error("Failed to register");
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    try {
      await removeParticipant(id);
      setParticipants((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Failed to remove athlete");
    }
  };

  // Group by team
  const byTeam = teams.reduce<Record<string, { team: Team; members: Participant[] }>>((acc, t) => {
    acc[t.id] = { team: t, members: participants.filter((p) => p.team_id === t.id) };
    return acc;
  }, {});

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Roster</h3>
      </div>

      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add teams first to manage rosters.</p>
      ) : (
        <div className="space-y-4">
          {Object.values(byTeam).map(({ team, members }) => (
            <div key={team.id} className="rounded-lg border border-border overflow-hidden">
              <div className="bg-destructive/80 text-destructive-foreground text-xs font-bold uppercase tracking-wider px-3 py-1.5 flex items-center justify-between">
                <span>{team.team_name}</span>
                {!canAdmin && !isRegistered && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive-foreground hover:bg-destructive/60" onClick={() => handleSelfRegister(team.id)} disabled={adding}>
                    <UserPlus className="h-3 w-3 mr-1" /> Join
                  </Button>
                )}
              </div>
              <div className="bg-background">
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-2">No athletes</p>
                ) : (
                  members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0">
                      <span className="text-sm text-foreground">{m.athlete_name}</span>
                      {canAdmin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(m.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          {canAdmin && (
            <div className="flex gap-2 mt-2">
              <Input placeholder="Athlete name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9 bg-background text-sm flex-1" />
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="h-9 w-36 bg-background text-sm">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim() || !selectedTeamId} className="bg-accent hover:bg-accent/90 text-accent-foreground h-9">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
