import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

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

interface LeaderboardPanelProps {
  competitionId: string;
  teams: Team[];
  workouts: Workout[];
}

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  division: string;
  totalScore: number;
  rank: number;
}

export function LeaderboardPanel({ competitionId, teams, workouts }: LeaderboardPanelProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const computeLeaderboard = async () => {
    const { data } = await supabase
      .from("competition_scores")
      .select("team_id, score")
      .eq("competition_id", competitionId);

    if (!data) return;

    const totals: Record<string, number> = {};
    data.forEach((s) => {
      totals[s.team_id] = (totals[s.team_id] || 0) + Number(s.score);
    });

    const sorted = teams
      .filter((t) => t.id)
      .map((t) => ({
        teamId: t.id!,
        teamName: t.team_name,
        division: t.division || "—",
        totalScore: totals[t.id!] || 0,
        rank: 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    sorted.forEach((e, i) => (e.rank = i + 1));
    setEntries(sorted);
  };

  useEffect(() => {
    computeLeaderboard();
  }, [competitionId, teams]);

  // Realtime subscription for score changes
  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-scores")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "competition_scores",
          filter: `competition_id=eq.${competitionId}`,
        },
        () => {
          computeLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [competitionId, teams]);

  if (teams.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Leaderboard</h3>
        </div>
        <p className="text-sm text-muted-foreground">Add teams and scores to see the leaderboard.</p>
      </div>
    );
  }

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Leaderboard</h3>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.teamId}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              entry.rank <= 3 ? "border-primary/30 bg-primary/5" : "border-border bg-background"
            }`}
          >
            <span className={`text-lg font-black w-8 text-center ${entry.rank <= 3 ? medalColors[entry.rank - 1] : "text-muted-foreground"}`}>
              {entry.rank}
            </span>
            <div className="flex-1">
              <p className="font-bold text-foreground text-sm">{entry.teamName}</p>
              <p className="text-xs text-muted-foreground">{entry.division}</p>
            </div>
            <span className="font-bold text-primary text-lg tabular-nums">{entry.totalScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
