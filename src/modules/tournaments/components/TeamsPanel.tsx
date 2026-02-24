import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { teamNameSchema } from "@/lib/validation";
import { useTeams, useAddTeam, useRemoveTeam } from "@/modules/tournaments/hooks";
import { useDivisions } from "@/modules/tournaments/hooks";
import type { Division } from "@/domain/competition";

interface TeamsPanelProps {
  competitionId: string;
  isOwner: boolean;
}

export function TeamsPanel({ competitionId, isOwner }: TeamsPanelProps) {
  const { data: teams = [], isLoading } = useTeams(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const addTeamMutation = useAddTeam();
  const removeTeamMutation = useRemoveTeam();

  const [newTeamName, setNewTeamName] = useState("");
  const [selectedDivisionId, setSelectedDivisionId] = useState("");

  const handleAdd = async () => {
    const parsed = teamNameSchema.safeParse(newTeamName);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const div = divisions.find((d: Division) => d.id === selectedDivisionId);
    try {
      await addTeamMutation.mutateAsync({
        competition_id: competitionId,
        team_name: newTeamName.trim(),
        division: div?.name || null,
        division_id: selectedDivisionId || null,
      });
      setNewTeamName("");
      toast.success("Team added!");
    } catch {
      toast.error("Failed to add team");
    }
  };

  const handleRemove = async (teamId: string) => {
    try {
      await removeTeamMutation.mutateAsync({ teamId, competitionId });
      toast.success("Team removed");
    } catch {
      toast.error("Failed to remove team");
    }
  };

  // Group teams by division
  const grouped = teams.reduce<Record<string, typeof teams>>((acc, t) => {
    const key = t.division || "No Division";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Teams</h3>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teams yet.</p>
      ) : (
        Object.entries(grouped).map(([divName, divTeams]) => (
          <div key={divName} className="mb-4 last:mb-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{divName}</p>
            <div className="space-y-2">
              {divTeams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm font-semibold text-foreground">{team.team_name}</span>
                  {isOwner && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(team.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {isOwner && (
        <div className="flex gap-2 mt-4">
          <Input placeholder="Team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
            className="bg-background flex-1" maxLength={100} />
          {divisions.length > 0 && (
            <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
              <SelectTrigger className="w-36 bg-background"><SelectValue placeholder="Division" /></SelectTrigger>
              <SelectContent>
                {divisions.map((d: Division) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleAdd} disabled={!newTeamName.trim() || addTeamMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
