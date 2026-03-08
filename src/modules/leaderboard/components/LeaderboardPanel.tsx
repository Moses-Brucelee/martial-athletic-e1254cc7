import { useMemo, useState } from "react";
import { Trophy, ArrowUp, ArrowDown, Minus, Monitor } from "lucide-react";
import { useLeaderboard } from "@/modules/leaderboard/hooks";
import { useCompetition, useWorkouts } from "@/modules/tournaments/hooks";
import { useScores } from "@/modules/scoring/hooks";
import { getAgeCategoryLabel } from "@/utils/calculateAge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardPanelProps {
  competitionId: string;
}

export function LeaderboardPanel({ competitionId }: LeaderboardPanelProps) {
  const { data: entries = [], isLoading } = useLeaderboard(competitionId);
  const { data: competition } = useCompetition(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: scoreRows = [] } = useScores(competitionId);
  const [whiteboardMode, setWhiteboardMode] = useState(false);

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

  const ageCategoryLabel = competition
    ? getAgeCategoryLabel(competition.age_category_type, competition.min_age, competition.max_age)
    : null;

  // Build per-workout rank map for expanded view
  const workoutScoreMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    scoreRows.forEach((s) => {
      if (!map[s.team_id]) map[s.team_id] = {};
      map[s.team_id][s.workout_id] = s.score;
    });
    return map;
  }, [scoreRows]);

  const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    const div = entry.division_name || "Overall";
    if (!acc[div]) acc[div] = [];
    acc[div].push(entry);
    return acc;
  }, {});

  if (isLoading) {
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

  // Whiteboard / TV mode
  if (whiteboardMode) {
    return (
      <div className="fixed inset-0 z-50 bg-background p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-black text-foreground uppercase tracking-tight">
                {competition?.name || "Leaderboard"}
              </h1>
            </div>
            <Button variant="outline" onClick={() => setWhiteboardMode(false)}>
              Exit Whiteboard
            </Button>
          </div>

          {Object.entries(grouped).map(([divName, divEntries]) => (
            <div key={divName} className="mb-10">
              {Object.keys(grouped).length > 1 && (
                <h2 className="text-2xl font-black text-primary uppercase mb-4">{divName}</h2>
              )}
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="text-left py-3 px-4 text-lg font-black text-foreground uppercase">Rank</th>
                    <th className="text-left py-3 px-4 text-lg font-black text-foreground uppercase">Team</th>
                    {workouts.map((w) => (
                      <th key={w.id} className="text-center py-3 px-4 text-lg font-black text-foreground uppercase">
                        WOD {w.workout_number}
                      </th>
                    ))}
                    <th className="text-center py-3 px-4 text-lg font-black text-primary uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {divEntries.map((entry, i) => (
                    <tr key={entry.team_id}
                      className={`border-b border-border/50 ${i < 3 ? "bg-primary/5" : ""}`}>
                      <td className={`py-4 px-4 text-2xl font-black ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}>
                        {i + 1}
                      </td>
                      <td className="py-4 px-4 text-xl font-bold text-foreground">{entry.team_name}</td>
                      {workouts.map((w) => (
                        <td key={w.id} className="py-4 px-4 text-center text-lg text-foreground tabular-nums">
                          {workoutScoreMap[entry.team_id]?.[w.id] ?? "—"}
                        </td>
                      ))}
                      <td className="py-4 px-4 text-center text-2xl font-black text-primary tabular-nums">
                        {entry.total_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Leaderboard</h3>
          {ageCategoryLabel && ageCategoryLabel !== "Open" && (
            <Badge variant="secondary" className="ml-2 text-xs">{ageCategoryLabel}</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setWhiteboardMode(true)}
          className="flex items-center gap-1">
          <Monitor className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Whiteboard</span>
        </Button>
      </div>

      <Tabs defaultValue="standings">
        <TabsList className="mb-4">
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="breakdown">Workout Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          {Object.entries(grouped).map(([divName, divEntries]) => (
            <div key={divName} className="mb-6 last:mb-0">
              {Object.keys(grouped).length > 1 && (
                <div className="bg-destructive/80 text-destructive-foreground text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-t-lg text-center mb-0">
                  {divName}
                </div>
              )}
              <div className="space-y-2">
                {divEntries.map((entry, i) => (
                  <div key={entry.team_id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      i < 3 ? "border-primary/30 bg-primary/5" : "border-border bg-background"
                    }`}>
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
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-bold text-foreground uppercase text-xs">#</th>
                  <th className="text-left py-2 px-2 font-bold text-foreground uppercase text-xs">Team</th>
                  {workouts.map((w) => (
                    <th key={w.id} className="text-center py-2 px-2 font-bold text-foreground uppercase text-xs">
                      WOD {w.workout_number}
                    </th>
                  ))}
                  <th className="text-center py-2 px-2 font-bold text-primary uppercase text-xs">Total</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={entry.team_id} className="border-b border-border/50">
                    <td className={`py-2 px-2 font-black text-xs ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}>
                      {i + 1}
                    </td>
                    <td className="py-2 px-2 font-semibold text-foreground text-xs">{entry.team_name}</td>
                    {workouts.map((w) => (
                      <td key={w.id} className="py-2 px-2 text-center text-xs text-foreground tabular-nums">
                        {workoutScoreMap[entry.team_id]?.[w.id] ?? "—"}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center font-bold text-primary text-xs tabular-nums">
                      {entry.total_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
