import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardList, Save } from "lucide-react";
import { toast } from "sonner";

interface Team {
  id?: string;
  team_name: string;
  division: string;
}

interface Workout {
  id: string;
  workout_number: number;
  measurement_type: string;
  name: string | null;
}

interface ScoresPanelProps {
  competitionId: string;
  teams: Team[];
  workouts: Workout[];
  isOwner: boolean;
}

export function ScoresPanel({ competitionId, teams, workouts, isOwner }: ScoresPanelProps) {
  // scores keyed by `${teamId}-${workoutId}`
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("competition_scores")
        .select("team_id, workout_id, score")
        .eq("competition_id", competitionId);

      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s) => {
          map[`${s.team_id}-${s.workout_id}`] = String(s.score);
        });
        setScores(map);
      }
    };
    load();
  }, [competitionId]);

  const updateScore = (teamId: string, workoutId: string, value: string) => {
    setScores((prev) => ({ ...prev, [`${teamId}-${workoutId}`]: value }));
  };

  const saveScores = async () => {
    setSaving(true);
    const upserts = Object.entries(scores)
      .filter(([, val]) => val !== "" && !isNaN(Number(val)))
      .map(([key, val]) => {
        const [team_id, workout_id] = key.split("-");
        return { competition_id: competitionId, team_id, workout_id, score: Number(val) };
      });

    if (upserts.length > 0) {
      const { error } = await supabase
        .from("competition_scores")
        .upsert(upserts, { onConflict: "team_id,workout_id" });

      if (error) {
        toast.error("Failed to save scores");
      } else {
        toast.success("Scores saved!");
      }
    }
    setSaving(false);
  };

  if (workouts.length === 0 || teams.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Scores</h3>
        </div>
        <p className="text-sm text-muted-foreground">Add teams and workouts first to enter scores.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Scores</h3>
        </div>
        {isOwner && (
          <Button size="sm" onClick={saveScores} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-bold text-foreground uppercase text-xs">Team</th>
              {workouts.map((w) => (
                <th key={w.id} className="text-center py-2 px-2 font-bold text-foreground uppercase text-xs whitespace-nowrap">
                  WOD {w.workout_number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b border-border/50">
                <td className="py-2 px-2 font-semibold text-foreground text-xs whitespace-nowrap">{team.team_name}</td>
                {workouts.map((w) => {
                  const key = `${team.id}-${w.id}`;
                  return (
                    <td key={w.id} className="py-2 px-1 text-center">
                      {isOwner ? (
                        <Input
                          type="number"
                          value={scores[key] || ""}
                          onChange={(e) => updateScore(team.id!, w.id, e.target.value)}
                          className="h-7 w-20 mx-auto text-center text-xs bg-background"
                        />
                      ) : (
                        <span className="text-foreground font-medium text-xs">{scores[key] || "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
