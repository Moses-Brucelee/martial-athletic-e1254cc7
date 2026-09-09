import { useEffect, useMemo, useRef, useState } from "react";
import { Trophy, RefreshCw, Minimize2, Download, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompetition, useTeams, useWorkouts, useDivisions } from "@/modules/tournaments/hooks";
import { useHeats, useAllHeatAssignments } from "@/modules/tournaments/hooks-engine";
import { useRegistrations } from "@/modules/athletes/hooks";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJudges } from "@/data/judges";
import { fetchHeatJudges } from "@/data/heatJudges";
import { getWorkoutColor } from "@/lib/workoutColors";
import { downloadNodeAsImage } from "@/lib/exportImage";
import { toast } from "sonner";

interface HeatSheetWhiteboardProps {
  competitionId: string;
  onExit: () => void;
}

export function HeatSheetWhiteboard({ competitionId, onExit }: HeatSheetWhiteboardProps) {
  const qc = useQueryClient();
  const { data: competition } = useCompetition(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: heats = [] } = useHeats(competitionId);
  const { data: teams = [] } = useTeams(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const { data: assignments = [] } = useAllHeatAssignments(competitionId);
  const { data: registrations = [] } = useRegistrations(competitionId);

  const { data: judges = [] } = useQuery({
    queryKey: ["judges", competitionId],
    queryFn: () => fetchJudges(competitionId),
  });
  const { data: heatJudges = [] } = useQuery({
    queryKey: ["heat-judges", competitionId],
    queryFn: () => fetchHeatJudges(competitionId),
  });

  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [exporting, setExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Auto-refresh every 5s
  useEffect(() => {
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["heats", competitionId] });
      qc.invalidateQueries({ queryKey: ["heat-assignments-all", competitionId] });
    }, 5000);
    return () => clearInterval(t);
  }, [competitionId, qc]);

  const teamById = useMemo(() => {
    const m = new Map<string, (typeof teams)[number]>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  const divisionById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of divisions) m.set(d.id, d.name);
    return m;
  }, [divisions]);

  // lane-accurate judge lookup: "heatId::lane" → judge name, plus heat-level fallback list
  const laneJudgeName = useMemo(() => {
    const m = new Map<string, string>();
    for (const hj of heatJudges) {
      const j = judges.find((x) => x.id === hj.judge_id);
      const name = j?.display_name?.trim() || hj.display_name?.trim() || "";
      if (!name || !hj.lane_number) continue;
      m.set(`${hj.heat_id}::${hj.lane_number}`, name);
    }
    return m;
  }, [heatJudges, judges]);

  const unlanedJudges = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const hj of heatJudges) {
      if (hj.lane_number) continue;
      const j = judges.find((x) => x.id === hj.judge_id);
      const name = j?.display_name?.trim() || hj.display_name?.trim() || "";
      if (!name) continue;
      if (!m.has(hj.heat_id)) m.set(hj.heat_id, []);
      m.get(hj.heat_id)!.push(name);
    }
    return m;
  }, [heatJudges, judges]);

  const athleteById = useMemo(() => {
    const m = new Map<string, (typeof registrations)[number]>();
    for (const r of registrations) m.set(r.id, r);
    return m;
  }, [registrations]);

  const workoutName = (wid: string | null | undefined) => {
    if (!wid) return "Unassigned";
    const w = workouts.find((x) => x.id === wid);
    return w?.name || `WOD #${w?.workout_number ?? ""}`;
  };

  /** One consolidated board: every heat, chronological, all divisions together. */
  const rows = useMemo(() => {
    const assignmentByHeat = new Map<string, typeof assignments>();
    for (const a of assignments) {
      if (!assignmentByHeat.has(a.heat_id)) assignmentByHeat.set(a.heat_id, []);
      assignmentByHeat.get(a.heat_id)!.push(a);
    }

    type Entry = { label: string; divisionId: string };
    const built = heats.map((heat) => {
      const heatAssignments = [...(assignmentByHeat.get(heat.id) ?? [])].sort(
        (a, b) => (a.lane_number ?? 9999) - (b.lane_number ?? 9999),
      );
      const lanes = new Map<number, Entry>();
      let nextFree = 1;
      for (const a of heatAssignments) {
        const team = a.team_id ? teamById.get(a.team_id) : undefined;
        const athlete = a.athlete_registration_id ? athleteById.get(a.athlete_registration_id) : undefined;
        const label = team?.team_name || athlete?.athlete_name || "—";
        const divisionId = team?.division_id || (athlete as any)?.division_id || "_nodiv";
        let lane = a.lane_number ?? 0;
        if (!lane || lanes.has(lane)) {
          let candidate = nextFree;
          while (lanes.has(candidate)) candidate += 1;
          lane = candidate;
        }
        nextFree = lane + 1;
        lanes.set(lane, { label, divisionId });
      }
      return { heat, lanes };
    });

    // Chronological: scheduled heats first by start time, unscheduled last by heat number
    built.sort((a, b) => {
      const ta = a.heat.scheduled_start ? new Date(a.heat.scheduled_start).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.heat.scheduled_start ? new Date(b.heat.scheduled_start).getTime() : Number.MAX_SAFE_INTEGER;
      if (ta !== tb) return ta - tb;
      return a.heat.heat_number - b.heat.heat_number;
    });
    return built;
  }, [heats, assignments, teamById, athleteById]);

  // Division filter narrows lane entries only — it never splits the board
  const visibleRows = useMemo(() => {
    if (selectedDivision === "all") return rows;
    return rows
      .map((r) => ({
        heat: r.heat,
        lanes: new Map(Array.from(r.lanes.entries()).filter(([, e]) => e.divisionId === selectedDivision)),
      }))
      .filter((r) => r.lanes.size > 0);
  }, [rows, selectedDivision]);

  const laneColumns = useMemo(() => {
    const max = Math.max(
      1,
      ...visibleRows.map((r) =>
        Math.max(r.heat.lane_count || 0, ...(r.lanes.size ? Array.from(r.lanes.keys()) : [0])),
      ),
    );
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [visibleRows]);

  const handleDownload = async (format: "png" | "jpeg") => {
    if (!boardRef.current) return;
    setExporting(true);
    try {
      const safeName = (competition?.name || "heat-sheet").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
      await downloadNodeAsImage(boardRef.current, `${safeName}-heat-sheet`, format);
      toast.success(`Heat sheet exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(`Export failed: ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {/* Controls */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs animate-pulse">
            <RefreshCw className="h-3 w-3 mr-1" /> Auto-refreshing
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {divisions.length > 1 && (
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger className="h-9 w-40 text-sm">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload("png")}>PNG image</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("jpeg")}>JPEG image</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={onExit}>
            <Minimize2 className="h-4 w-4 mr-1" /> Exit
          </Button>
        </div>
      </div>

      {/* Board (captured for export) */}
      <div ref={boardRef} className="bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight">
              {competition?.name || "Heat Sheet"}
            </h1>
          </div>

          {visibleRows.length === 0 && (
            <p className="text-muted-foreground text-sm">No heats scheduled yet.</p>
          )}

          {visibleRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="text-left py-2 px-3 text-xs md:text-sm font-black text-foreground uppercase tracking-wider w-20">Time</th>
                    <th className="text-left py-2 px-3 text-xs md:text-sm font-black text-foreground uppercase tracking-wider w-24">Heat</th>
                    <th className="text-left py-2 px-3 text-xs md:text-sm font-black text-foreground uppercase tracking-wider w-32">Workout</th>
                    {laneColumns.map((n) => (
                      <th key={n} className="text-center py-2 px-3 text-xs md:text-sm font-black text-foreground uppercase tracking-wider">
                        Lane {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ heat, lanes: laneMap }, i) => {
                    const color = getWorkoutColor(heat.workout_id ?? null);
                    const time = heat.scheduled_start
                      ? new Date(heat.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—";
                    const spare = unlanedJudges.get(heat.id) ?? [];
                    return (
                      <tr key={heat.id} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                        <td className="py-3 px-3 font-mono font-black text-sm md:text-base tabular-nums" style={{ color: color.text }}>
                          {time}
                        </td>
                        <td className="py-3 px-3 text-xs md:text-sm font-black text-foreground uppercase tracking-wider">
                          Heat {heat.heat_number}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: color.bg, color: color.text }}
                          >
                            {workoutName(heat.workout_id)}
                          </span>
                        </td>
                        {laneColumns.map((n) => {
                          const entry = laneMap.get(n);
                          const judge = laneJudgeName.get(`${heat.id}::${n}`) ?? spare[(n - 1) % Math.max(spare.length, 1)];
                          const divLabel = entry
                            ? entry.divisionId === "_nodiv"
                              ? ""
                              : divisionById.get(entry.divisionId) || ""
                            : "";
                          return (
                            <td key={n} className="py-3 px-3 text-center align-middle">
                              {entry ? (
                                <div className="flex flex-col items-center leading-tight">
                                  <span className="text-xs md:text-sm font-black uppercase tracking-wider" style={{ color: color.text }}>
                                    {entry.label}
                                  </span>
                                  {divLabel && (
                                    <span className="mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                                      {divLabel}
                                    </span>
                                  )}
                                  {judge && (
                                    <span className="text-[9px] font-semibold uppercase text-muted-foreground mt-0.5">
                                      Judge: {judge}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/40">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
