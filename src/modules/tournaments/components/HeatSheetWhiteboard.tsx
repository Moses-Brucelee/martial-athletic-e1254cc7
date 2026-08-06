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

  const heatJudgeNames = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const hj of heatJudges) {
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

  // Build [division → workout → heats] structure
  const grouped = useMemo(() => {
    const assignmentByHeat = new Map<string, typeof assignments>();
    for (const a of assignments) {
      if (!assignmentByHeat.has(a.heat_id)) assignmentByHeat.set(a.heat_id, []);
      assignmentByHeat.get(a.heat_id)!.push(a);
    }

    type Row = { heat: (typeof heats)[number]; lanes: Map<number, string> };
    const structure = new Map<string /* divisionId or _all */, Map<string /* workoutId */, Row[]>>();

    for (const heat of heats) {
      const wid = heat.workout_id || "_unassigned";
      const heatAssignments = [...(assignmentByHeat.get(heat.id) ?? [])].sort(
        (a, b) => (a.lane_number ?? 9999) - (b.lane_number ?? 9999),
      );
      const laneByDiv = new Map<string, Map<number, string>>();
      // Track next free lane per division for assignments without an explicit lane
      const nextFree = new Map<string, number>();

      for (const a of heatAssignments) {
        const team = a.team_id ? teamById.get(a.team_id) : undefined;
        const athlete = a.athlete_registration_id ? athleteById.get(a.athlete_registration_id) : undefined;
        const label = team?.team_name || athlete?.athlete_name || "—";
        const divId = team?.division_id || (athlete as any)?.division_id || "_nodiv";
        if (!laneByDiv.has(divId)) laneByDiv.set(divId, new Map());
        const lanes = laneByDiv.get(divId)!;

        let lane = a.lane_number ?? 0;
        if (!lane || lanes.has(lane)) {
          // fall back to the first unoccupied lane for this division
          let candidate = nextFree.get(divId) ?? 1;
          while (lanes.has(candidate)) candidate += 1;
          lane = candidate;
        }
        nextFree.set(divId, lane + 1);
        lanes.set(lane, label);
      }

      if (laneByDiv.size === 0) laneByDiv.set("_nodiv", new Map());

      for (const [divId, lanes] of laneByDiv) {
        if (!structure.has(divId)) structure.set(divId, new Map());
        const byW = structure.get(divId)!;
        if (!byW.has(wid)) byW.set(wid, []);
        byW.get(wid)!.push({ heat, lanes });
      }
    }

    // Sort heats within each workout by heat_number
    for (const byW of structure.values()) {
      for (const rows of byW.values()) rows.sort((a, b) => a.heat.heat_number - b.heat.heat_number);
    }
    return structure;
  }, [heats, assignments, teamById, athleteById]);

  const visibleDivisions = useMemo(() => {
    const ids = Array.from(grouped.keys());
    if (selectedDivision === "all") return ids;
    return ids.filter((d) => d === selectedDivision);
  }, [grouped, selectedDivision]);

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

          {visibleDivisions.length === 0 && (
            <p className="text-muted-foreground text-sm">No heats scheduled yet.</p>
          )}

          {visibleDivisions.map((divId) => {
            const byWorkout = grouped.get(divId)!;
            const divLabel = divId === "_nodiv" ? "No division" : (divisionById.get(divId) || "Division");
            return (
              <section key={divId} className="mb-10">
                <h2 className="text-lg md:text-xl font-black text-primary uppercase tracking-widest mb-3">
                  {divLabel}
                </h2>

                {Array.from(byWorkout.entries()).map(([wid, rows], eventIdx) => {
                  const w = workouts.find((x) => x.id === wid);
                  const color = getWorkoutColor(wid === "_unassigned" ? null : wid);
                  const wName = wid === "_unassigned" ? "Unassigned" : (w?.name || `WOD #${w?.workout_number ?? ""}`);
                  const lanes = Array.from({ length: laneCountMax }, (_, i) => i + 1);
                  return (
                    <div key={wid} className="mb-6 last:mb-0">
                      <h3 className="text-sm md:text-base font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span className="text-foreground">Event {eventIdx + 1}:</span>
                        <span style={{ color: color.text }}>{wName}</span>
                      </h3>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2" style={{ borderColor: color.solid }}>
                              <th className="text-left py-2 px-3 text-xs md:text-sm font-black text-foreground uppercase tracking-wider w-20">Time</th>
                              <th className="text-left py-2 px-3 text-xs md:text-sm font-black text-foreground uppercase tracking-wider w-24">Heats</th>
                              {lanes.map((n) => (
                                <th key={n} className="text-center py-2 px-3 text-xs md:text-sm font-black text-foreground uppercase tracking-wider">
                                  Lane {n}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(({ heat, lanes: laneMap }, i) => {
                              const time = heat.scheduled_start
                                ? new Date(heat.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "—";
                              const judgesForHeat = heatJudgeNames.get(heat.id) ?? [];
                              return (
                                <tr key={heat.id} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                                  <td className="py-3 px-3 font-mono font-black text-sm md:text-base tabular-nums" style={{ color: color.text }}>
                                    {time}
                                  </td>
                                  <td className="py-3 px-3 text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                    Heat {heat.heat_number}
                                  </td>
                                  {lanes.map((n, laneIdx) => {
                                    const teamName = laneMap.get(n);
                                    const judge = judgesForHeat[laneIdx % Math.max(judgesForHeat.length, 1)];
                                    return (
                                      <td key={n} className="py-3 px-3 text-center align-middle">
                                        {teamName ? (
                                          <div className="flex flex-col items-center leading-tight">
                                            <span className="text-xs md:text-sm font-black uppercase tracking-wider" style={{ color: color.text }}>
                                              {teamName}
                                            </span>
                                            {judge && (
                                              <span className="text-[9px] font-semibold uppercase text-muted-foreground mt-0.5">
                                                J: {judge}
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
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
