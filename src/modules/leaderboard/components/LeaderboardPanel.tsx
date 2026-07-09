import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Trophy, Monitor, Filter, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Maximize2, Minimize2, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadNodeAsImage } from "@/lib/exportImage";
import { toast } from "sonner";
import { useLeaderboard } from "@/modules/leaderboard/hooks";
import { useCompetition, useWorkouts, useDivisions, useTeams } from "@/modules/tournaments/hooks";
import { useCompetitionSettings } from "@/modules/tournaments/hooks-engine";
import { useScores } from "@/modules/scoring/hooks";
import { useHeats } from "@/modules/tournaments/hooks-engine";
import { getAgeCategoryLabel } from "@/utils/calculateAge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTimeMMSS, ordinal } from "@/utils/format";

interface LeaderboardPanelProps {
  competitionId: string;
}

type SortField = "rank" | "total" | "team" | "division" | string; // string for workout ids
type SortDir = "asc" | "desc";

export function LeaderboardPanel({ competitionId }: LeaderboardPanelProps) {
  const { data: rawEntries = [], isLoading, refetch } = useLeaderboard(competitionId);
  const { data: competition } = useCompetition(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const { data: teams = [] } = useTeams(competitionId);
  const { data: scoreRows = [] } = useScores(competitionId);
  const { data: settings } = useCompetitionSettings(competitionId);
  const { data: heats = [] } = useHeats(competitionId);
  const [whiteboardMode, setWhiteboardMode] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Whiteboard auto-refresh every 5 seconds
  useEffect(() => {
    if (!whiteboardMode) return;
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [whiteboardMode, refetch]);

  // Reverse sort if ranking direction is 'asc' (lowest points wins)
  const entries = useMemo(() => {
    if (settings?.ranking_direction === "asc") {
      return [...rawEntries].sort((a, b) => Number(a.total_points) - Number(b.total_points));
    }
    return rawEntries;
  }, [rawEntries, settings?.ranking_direction]);

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

  const ageCategoryLabel = competition
    ? getAgeCategoryLabel(competition.age_category_type, competition.min_age, competition.max_age)
    : null;

  // Per-workout map: team_id → workout_id → { raw, scoringType, sortValue, rank, display }
  // - raw: the raw value (seconds, reps, kg, points)
  // - sortValue: numeric for sort comparisons (always "higher is better")
  // - rank: per-workout placement (1 = best)
  // - display: formatted string ("3:24", "120 reps", "200kg", "85 pts")
  const workoutScoreMap = useMemo(() => {
    type Cell = { raw: number; scoringType: string; sortValue: number; rank: number; display: string };
    const workoutTypeMap: Record<string, string> = {};
    workouts.forEach((w) => { workoutTypeMap[w.id] = w.scoring_type || "points"; });

    // Team → division lookup so per-workout ranks are scoped per division
    const teamDivisionMap: Record<string, string> = {};
    teams.forEach((t: any) => { teamDivisionMap[t.id] = t.division_id || "__nodiv__"; });

    // Group raw values per (workout, division) to compute per-division ranks
    const byWorkoutDiv: Record<string, { team_id: string; raw: number; sortValue: number }[]> = {};
    scoreRows.forEach((s) => {
      const stype = workoutTypeMap[s.workout_id] || "points";
      let raw: number | null = null;
      if (stype === "time") raw = s.time_seconds ?? s.score ?? null;
      else if (stype === "reps") raw = s.reps_completed ?? s.score ?? null;
      else if (stype === "load") raw = s.load_value ?? s.score ?? null;
      else raw = s.points_awarded ?? s.score ?? null;
      if (raw == null) return;
      const sortValue = stype === "time" ? -Number(raw) : Number(raw);
      const div = teamDivisionMap[s.team_id] || "__nodiv__";
      const key = `${s.workout_id}::${div}`;
      if (!byWorkoutDiv[key]) byWorkoutDiv[key] = [];
      byWorkoutDiv[key].push({ team_id: s.team_id, raw: Number(raw), sortValue });
    });

    const map: Record<string, Record<string, Cell>> = {};
    Object.entries(byWorkoutDiv).forEach(([key, rows]) => {
      const wid = key.split("::")[0];
      const stype = workoutTypeMap[wid] || "points";
      const sorted = [...rows].sort((a, b) => b.sortValue - a.sortValue);
      let lastValue: number | null = null;
      let lastRank = 0;
      sorted.forEach((row, i) => {
        let rank: number;
        if (lastValue !== null && row.sortValue === lastValue) {
          rank = lastRank;
        } else {
          rank = i + 1;
          lastRank = rank;
          lastValue = row.sortValue;
        }
        const display =
          stype === "time" ? formatTimeMMSS(row.raw) :
          stype === "reps" ? `${row.raw}` :
          stype === "load" ? `${row.raw}kg` :
          `${row.raw}`;
        if (!map[row.team_id]) map[row.team_id] = {};
        map[row.team_id][wid] = { raw: row.raw, scoringType: stype, sortValue: row.sortValue, rank, display };
      });
    });
    return map;
  }, [scoreRows, workouts, teams]);

  // Helper: render a workout cell (display + ordinal rank in parens)
  const renderCell = (teamId: string, workoutId: string) => {
    const cell = workoutScoreMap[teamId]?.[workoutId];
    if (!cell) return "—";
    return (
      <span className="inline-flex items-baseline gap-1 tabular-nums">
        <span className="font-semibold text-foreground">{cell.display}</span>
        <span className="text-[10px] text-muted-foreground">({ordinal(cell.rank)})</span>
      </span>
    );
  };

  // Filter by division
  const filteredEntries = useMemo(() => {
    if (selectedDivision === "all") return entries;
    return entries.filter((e) => e.division_id === selectedDivision || e.division_name === selectedDivision);
  }, [entries, selectedDivision]);

  // Sort entries
  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "rank":
          cmp = 0; // already ranked
          break;
        case "total":
          cmp = Number(a.total_points) - Number(b.total_points);
          break;
        case "team":
          cmp = a.team_name.localeCompare(b.team_name);
          break;
        case "division":
          cmp = (a.division_name || "").localeCompare(b.division_name || "");
          break;
        default:
          // Sort by specific workout score (use unified sortValue: higher = better)
          const aScore = workoutScoreMap[a.team_id]?.[sortField]?.sortValue ?? -Infinity;
          const bScore = workoutScoreMap[b.team_id]?.[sortField]?.sortValue ?? -Infinity;
          cmp = aScore - bScore;
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [filteredEntries, sortField, sortDir, workoutScoreMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "team" || field === "division" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const grouped = sortedEntries.reduce<Record<string, typeof entries>>((acc, entry) => {
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

  // Whiteboard / TV mode with auto-refresh
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
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1" /> Auto-refreshing
              </Badge>
              {divisions.length > 1 && (
                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="h-9 w-40 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" onClick={() => setWhiteboardMode(false)}>
                <Minimize2 className="h-4 w-4 mr-1" /> Exit
              </Button>
            </div>
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
                    <th className="text-left py-3 px-4 text-lg font-black text-foreground uppercase">Athlete</th>
                    {workouts.map((w) => (
                      <th key={w.id} className="text-center py-3 px-4 text-lg font-black text-foreground uppercase">
                        {w.name || `WOD ${w.workout_number}`}
                      </th>
                    ))}
                    <th className="text-center py-3 px-4 text-lg font-black text-primary uppercase">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {divEntries.map((entry, i) => (
                    <tr key={entry.team_id}
                      className={`border-b border-border/50 transition-colors ${i < 3 ? "bg-primary/5" : ""}`}>
                      <td className={`py-4 px-4 text-2xl font-black ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}>
                        {i + 1}
                      </td>
                      <td className="py-4 px-4 text-xl font-bold text-foreground">{entry.team_name}</td>
                      {workouts.map((w) => (
                        <td key={w.id} className="py-4 px-4 text-center text-lg text-foreground tabular-nums">
                          {renderCell(entry.team_id, w.id)}
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Leaderboard</h3>
          {ageCategoryLabel && ageCategoryLabel !== "Open" && (
            <Badge variant="secondary" className="ml-2 text-xs">{ageCategoryLabel}</Badge>
          )}
          {settings?.ranking_direction === "asc" && (
            <Badge variant="outline" className="text-xs"><ArrowUp className="h-3 w-3 mr-0.5" /> Low Wins</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {divisions.length > 1 && (
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => setWhiteboardMode(true)}
            className="flex items-center gap-1">
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Whiteboard</span>
          </Button>
        </div>
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
                      {entry.division_name && (
                        <p className="text-[10px] text-muted-foreground">{entry.division_name}</p>
                      )}
                    </div>
                    <span className="font-bold text-primary text-lg tabular-nums">{entry.total_points} pts</span>
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
                  <th className="text-left py-2 px-2 font-bold text-foreground uppercase text-xs cursor-pointer select-none"
                    onClick={() => handleSort("rank")}>
                    <span className="flex items-center gap-1"># <SortIcon field="rank" /></span>
                  </th>
                  <th className="text-left py-2 px-2 font-bold text-foreground uppercase text-xs cursor-pointer select-none"
                    onClick={() => handleSort("team")}>
                    <span className="flex items-center gap-1">Athlete <SortIcon field="team" /></span>
                  </th>
                  {workouts.map((w) => (
                    <th key={w.id} className="text-center py-2 px-2 font-bold text-foreground uppercase text-xs cursor-pointer select-none"
                      onClick={() => handleSort(w.id)}>
                      <span className="flex items-center justify-center gap-1">
                        {w.name || `WOD ${w.workout_number}`}
                        <SortIcon field={w.id} />
                      </span>
                    </th>
                  ))}
                  <th className="text-center py-2 px-2 font-bold text-primary uppercase text-xs cursor-pointer select-none"
                    onClick={() => handleSort("total")}>
                    <span className="flex items-center justify-center gap-1">Points <SortIcon field="total" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry, i) => (
                  <tr key={entry.team_id} className="border-b border-border/50">
                    <td className={`py-2 px-2 font-black text-xs ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}>
                      {i + 1}
                    </td>
                    <td className="py-2 px-2 font-semibold text-foreground text-xs">
                      {entry.team_name}
                      {entry.division_name && (
                        <span className="block text-[10px] text-muted-foreground font-normal">{entry.division_name}</span>
                      )}
                    </td>
                    {workouts.map((w) => (
                      <td key={w.id} className="py-2 px-2 text-center text-xs text-foreground tabular-nums">
                        {renderCell(entry.team_id, w.id)}
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
