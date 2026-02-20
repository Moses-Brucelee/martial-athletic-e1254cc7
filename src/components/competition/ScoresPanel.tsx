import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardList, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import { upsertScores } from "@/data/scoring";

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
  is_locked?: boolean;
}

interface ScoresPanelProps {
  competitionId: string;
  teams: Team[];
  workouts: Workout[];
  canScore: boolean;
  judgeId?: string;
}

export function ScoresPanel({ competitionId, teams, workouts, canScore, judgeId }: ScoresPanelProps) {
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
    try {
      const upserts = Object.entries(scores)
        .filter(([, val]) => val !== "" && !isNaN(Number(val)))
        .map(([key, val]) => {
          const [team_id, workout_id] = key.split("-");
          return { competition_id: competitionId, team_id, workout_id, score: Number(val), judge_id: judgeId || null };
        });

      await upsertScores(upserts);
      toast.success("Scores saved!");
    } catch {
      toast.error("Failed to save scores");
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
        {canScore && (
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
                  {w.is_locked && <Lock className="inline h-3 w-3 ml-1 text-destructive" />}
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
                  const isLocked = w.is_locked;
                  return (
                    <td key={w.id} className="py-2 px-1 text-center">
                      {canScore && !isLocked ? (
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
