import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Users } from "lucide-react";

interface Team {
  id?: string;
  team_name: string;
  division: string;
}

interface TeamsPanelProps {
  competitionId: string;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  isOwner: boolean;
}

export function TeamsPanel({ competitionId, teams, setTeams, isOwner }: TeamsPanelProps) {
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDivision, setNewTeamDivision] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);

  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    setAddingTeam(true);
    const { data, error } = await supabase
      .from("competition_teams")
      .insert({ competition_id: competitionId, team_name: newTeamName.trim(), division: newTeamDivision || null })
      .select()
      .single();

    if (!error && data) {
      setTeams((prev) => [...prev, { id: data.id, team_name: data.team_name, division: data.division || "" }]);
      setNewTeamName("");
      setNewTeamDivision("");
    }
    setAddingTeam(false);
  };

  const removeTeam = async (teamId: string) => {
    await supabase.from("competition_teams").delete().eq("id", teamId);
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
  };

  // Group teams by division
  const divisions = teams.reduce<Record<string, Team[]>>((acc, team) => {
    const div = team.division || "No Division";
    if (!acc[div]) acc[div] = [];
    acc[div].push(team);
    return acc;
  }, {});

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Teams</h3>
      </div>

      {Object.keys(divisions).length === 0 && (
        <p className="text-sm text-muted-foreground mb-4">No teams yet.</p>
      )}

      {Object.entries(divisions).map(([divName, divTeams]) => (
        <div key={divName} className="mb-4">
          <div className="bg-destructive/80 text-destructive-foreground text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-t-lg text-center">
            Division: {divName}
          </div>
          <div className="border border-t-0 border-border rounded-b-lg overflow-hidden">
            {divTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0 bg-background"
              >
                <span className="font-semibold text-foreground text-sm">{team.team_name}</span>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => team.id && removeTeam(team.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {isOwner && (
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Team name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="h-9 bg-background text-sm flex-1"
          />
          <Input
            placeholder="Division"
            value={newTeamDivision}
            onChange={(e) => setNewTeamDivision(e.target.value)}
            className="h-9 bg-background text-sm w-28"
          />
          <Button
            size="sm"
            onClick={addTeam}
            disabled={addingTeam || !newTeamName.trim()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground h-9"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
