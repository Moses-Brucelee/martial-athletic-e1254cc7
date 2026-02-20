import { Trophy } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";

interface LeaderboardPanelProps {
  competitionId: string;
}

export function LeaderboardPanel({ competitionId }: LeaderboardPanelProps) {
  const { entries, loading } = useLeaderboard(competitionId);

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

  // Group by division
  const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    const div = entry.division_name || "Overall";
    if (!acc[div]) acc[div] = [];
    acc[div].push(entry);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Leaderboard</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entries.length === 0) {
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

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Leaderboard</h3>
      </div>

      {Object.entries(grouped).map(([divName, divEntries]) => (
        <div key={divName} className="mb-6 last:mb-0">
          {Object.keys(grouped).length > 1 && (
            <div className="bg-destructive/80 text-destructive-foreground text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-t-lg text-center mb-0">
              {divName}
            </div>
          )}
          <div className="space-y-2">
            {divEntries.map((entry, i) => (
              <div
                key={entry.team_id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  i < 3 ? "border-primary/30 bg-primary/5" : "border-border bg-background"
                }`}
              >
                <span className={`text-lg font-black w-8 text-center ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm">{entry.team_name}</p>
                </div>
                <span className="font-bold text-primary text-lg tabular-nums">{entry.total_points}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
