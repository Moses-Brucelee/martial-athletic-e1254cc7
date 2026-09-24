/**
 * Pure helpers that explain — without recalculating rankings — where a
 * configured tie breaker actually separated teams with equal primary scores.
 */
import { formatTimeMMSS } from "@/utils/format";

export interface TBStanding {
  team_id: string;
  division_key: string;
  total_points: number;
  /** Count of 1st places at index 0, 2nd places at index 1, … */
  placement_counts: number[];
}

const ordinalSuffix = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Global "most wins, then placements" labels. Only teams inside an equal-points
 * group whose placement counts actually differ receive a label.
 */
export function globalTieBreakerLabels(
  standings: TBStanding[],
  tieBreaker: string | null | undefined
): Record<string, { label: string; detail: string }> {
  const out: Record<string, { label: string; detail: string }> = {};
  if (tieBreaker !== "most_wins_placements") return out;

  const groups: Record<string, TBStanding[]> = {};
  standings.forEach((s) => {
    const k = `${s.division_key}::${Number(s.total_points)}`;
    (groups[k] ||= []).push(s);
  });

  Object.values(groups).forEach((g) => {
    if (g.length < 2) return;
    const len = Math.max(...g.map((s) => s.placement_counts.length), 1);
    // First placement index where the group differs.
    let idx = -1;
    for (let i = 0; i < len; i++) {
      const vals = new Set(g.map((s) => s.placement_counts[i] ?? 0));
      if (vals.size > 1) { idx = i; break; }
    }
    if (idx === -1) return; // still tied — tie breaker did not affect ranking
    g.forEach((s) => {
      const c = s.placement_counts[idx] ?? 0;
      const label = idx === 0 ? `TB: ${c} ${c === 1 ? "win" : "wins"}` : `TB: ${c}× ${ordinalSuffix(idx + 1)}`;
      const breakdown = s.placement_counts
        .slice(0, Math.max(idx + 1, 3))
        .map((n, i) => `${ordinalSuffix(i + 1)}: ${n ?? 0}`)
        .join(" · ");
      out[s.team_id] = { label, detail: breakdown };
    });
  });
  return out;
}

export interface TBWorkoutScore {
  team_id: string;
  workout_id: string;
  division_key: string;
  primary: number | null;
  work_completed?: number | null;
  tie_breaker_seconds?: number | null;
}

/**
 * Workout-level time tie breaker labels, keyed `team_id::workout_id`.
 * A label appears only where teams share the same primary result and their
 * tie-breaker times differ.
 */
export function workoutTieBreakerLabels(
  scores: TBWorkoutScore[],
  workoutTieBreakers: Record<string, string | null | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  const groups: Record<string, TBWorkoutScore[]> = {};
  scores.forEach((s) => {
    if (workoutTieBreakers[s.workout_id] !== "time" || s.primary == null) return;
    const k = `${s.workout_id}::${s.division_key}::${s.primary}::${s.work_completed ?? ""}`;
    (groups[k] ||= []).push(s);
  });
  Object.values(groups).forEach((g) => {
    if (g.length < 2) return;
    const tbs = new Set(g.map((s) => s.tie_breaker_seconds ?? null));
    if (tbs.size < 2) return;
    g.forEach((s) => {
      out[`${s.team_id}::${s.workout_id}`] =
        s.tie_breaker_seconds != null ? `TB: ${formatTimeMMSS(s.tie_breaker_seconds)}` : "TB: —";
    });
  });
  return out;
}
