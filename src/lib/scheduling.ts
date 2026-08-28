/**
 * Shared scheduling rules for competition heats and lanes.
 *
 * All helpers are pure so they can be reused by the UI (to disable invalid
 * options up front) and by the save paths (to protect data integrity).
 */

export const DEFAULT_HEAT_DURATION_MINUTES = 10;

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ScheduledHeatLike {
  id: string;
  scheduled_start: string | null;
  duration_minutes?: number | null;
  lane_count?: number | null;
  heat_number?: number | null;
}

/** Lane occupancy derived from heat assignments: heat id → lane numbers used. */
export type LaneUsage = Map<string, number[]>;

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function heatRange(heat: ScheduledHeatLike): TimeRange | null {
  if (!heat.scheduled_start) return null;
  const start = new Date(heat.scheduled_start);
  if (Number.isNaN(start.getTime())) return null;
  const mins = heat.duration_minutes && heat.duration_minutes > 0
    ? heat.duration_minutes
    : DEFAULT_HEAT_DURATION_MINUTES;
  return { start, end: addMinutes(start, mins) };
}

/** True when two ranges overlap: newStart < existingEnd && newEnd > existingStart. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

export interface CompetitionWindow {
  start: Date | null;
  end: Date | null;
}

export function parseWindow(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): CompetitionWindow {
  const parse = (v: string | null | undefined) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  return { start: parse(startIso), end: parse(endIso) };
}

/** Returns an error message when the range falls outside the competition window. */
export function validateWithinCompetition(
  range: TimeRange,
  window: CompetitionWindow,
): string | null {
  if (range.end.getTime() <= range.start.getTime()) {
    return "Heat end must be after the heat start";
  }
  if (window.start && range.start.getTime() < window.start.getTime()) {
    return "Heat cannot start before the competition starts";
  }
  if (window.end && range.end.getTime() > window.end.getTime()) {
    return "Heat cannot end after the competition ends";
  }
  return null;
}

export interface ConflictInput {
  /** The heat being created or edited. */
  range: TimeRange;
  /** Lanes the heat will occupy. Empty means "any lane up to lane_count". */
  lanes: number[];
  /** All other heats in the competition. */
  heats: ScheduledHeatLike[];
  /** heat id → lane numbers currently assigned in that heat. */
  laneUsage: LaneUsage;
  /** Heat id to ignore (the heat currently being edited). */
  excludeHeatId?: string;
}

export interface LaneConflict {
  lane: number;
  heatId: string;
  heatNumber?: number | null;
  range: TimeRange;
}

/** Lanes that are already busy at any point inside the given range. */
export function busyLanes(input: Omit<ConflictInput, "lanes">): Map<number, LaneConflict> {
  const busy = new Map<number, LaneConflict>();
  for (const heat of input.heats) {
    if (input.excludeHeatId && heat.id === input.excludeHeatId) continue;
    const other = heatRange(heat);
    if (!other || !rangesOverlap(input.range, other)) continue;
    const lanes = input.laneUsage.get(heat.id) ?? [];
    for (const lane of lanes) {
      if (!busy.has(lane)) {
        busy.set(lane, { lane, heatId: heat.id, heatNumber: heat.heat_number, range: other });
      }
    }
  }
  return busy;
}

/** Returns the first lane conflict for the proposed heat, or null when free. */
export function findLaneConflict(input: ConflictInput): LaneConflict | null {
  const busy = busyLanes(input);
  if (busy.size === 0) return null;
  const lanes = input.lanes.length > 0 ? input.lanes : [];
  if (lanes.length === 0) return null;
  for (const lane of lanes) {
    const hit = busy.get(lane);
    if (hit) return hit;
  }
  return null;
}

/**
 * Next logical start time for a new heat:
 * end of the latest scheduled heat, otherwise the competition start.
 * Result is clamped inside the competition window when one is known.
 */
export function nextHeatStart(
  heats: ScheduledHeatLike[],
  window: CompetitionWindow,
  durationMinutes = DEFAULT_HEAT_DURATION_MINUTES,
): Date | undefined {
  let latestEnd: Date | null = null;
  for (const h of heats) {
    const r = heatRange(h);
    if (!r) continue;
    if (!latestEnd || r.end.getTime() > latestEnd.getTime()) latestEnd = r.end;
  }
  let candidate = latestEnd ?? window.start ?? undefined;
  if (!candidate) return undefined;
  if (window.start && candidate.getTime() < window.start.getTime()) candidate = window.start;
  if (window.end) {
    const lastPossible = new Date(window.end.getTime() - durationMinutes * 60_000);
    if (candidate.getTime() > lastPossible.getTime()) {
      candidate = lastPossible.getTime() >= (window.start?.getTime() ?? 0)
        ? lastPossible
        : (window.start ?? candidate);
    }
  }
  return new Date(candidate);
}

/** Free lane numbers (1..laneCount) for a proposed range. */
export function availableLanes(
  laneCount: number,
  input: Omit<ConflictInput, "lanes">,
): number[] {
  const busy = busyLanes(input);
  const free: number[] = [];
  for (let lane = 1; lane <= laneCount; lane++) {
    if (!busy.has(lane)) free.push(lane);
  }
  return free;
}
