// ── Competition Scoring Engine — Pure Functions ───────────
// No framework or DB imports. Fully deterministic.

export type ScoringType = 'time' | 'reps' | 'load' | 'points';
export type WorkoutType = 'amrap' | 'emom' | 'for_time' | 'max_load' | 'interval' | 'rounds' | 'custom';
export type TieBreakerPolicy = 'best_final_round' | 'best_single_workout' | 'earliest_submission';

/** Map workout type to its default scoring type */
export function defaultScoringType(workoutType: WorkoutType): ScoringType {
  switch (workoutType) {
    case 'amrap':
    case 'emom':
    case 'rounds':
      return 'reps';
    case 'for_time':
    case 'interval':
      return 'time';
    case 'max_load':
      return 'load';
    case 'custom':
    default:
      return 'points';
  }
}

/** Whether lower normalized score is better for this scoring type */
export function isLowerBetter(scoringType: ScoringType): boolean {
  return scoringType === 'time';
}

// ── Normalization ─────────────────────────────────────────

export interface RawScore {
  team_id: string;
  reps_completed?: number | null;
  time_seconds?: number | null;
  load_value?: number | null;
  points_awarded?: number | null;
  score: number; // fallback canonical value
  submitted_at?: string | null;
}

export interface NormalizedEntry {
  team_id: string;
  normalized_score: number;
  submitted_at: string | null;
}

/**
 * Normalize a raw score into a single comparable number.
 * For capped workouts (time-based), non-finishers get time_cap + remaining penalty.
 */
export function normalizeScore(
  raw: RawScore,
  scoringType: ScoringType,
  timeCapSeconds?: number | null
): number {
  switch (scoringType) {
    case 'time': {
      const t = raw.time_seconds ?? raw.score;
      // If no time recorded and there's a cap, penalize
      if ((t === 0 || t == null) && timeCapSeconds) {
        return timeCapSeconds + 60; // penalty for non-finishers
      }
      return t;
    }
    case 'reps':
      return raw.reps_completed ?? raw.score;
    case 'load':
      return raw.load_value ?? raw.score;
    case 'points':
      return raw.points_awarded ?? raw.score;
    default:
      return raw.score;
  }
}

// ── Ranking ───────────────────────────────────────────────

export interface RankedEntry {
  team_id: string;
  normalized_score: number;
  rank: number;
  submitted_at: string | null;
}

/**
 * Compute dense ranks from normalized scores.
 * Lower rank = better. For TIME: lower score = lower rank.
 * For REPS/LOAD/POINTS: higher score = lower rank.
 */
export function computeRanks(
  entries: NormalizedEntry[],
  scoringType: ScoringType
): RankedEntry[] {
  const lowerIsBetter = isLowerBetter(scoringType);

  const sorted = [...entries].sort((a, b) => {
    const diff = lowerIsBetter
      ? a.normalized_score - b.normalized_score
      : b.normalized_score - a.normalized_score;
    return diff;
  });

  const result: RankedEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].normalized_score !== sorted[i - 1].normalized_score) {
      currentRank = i + 1; // dense_rank uses position for gaps
    }
    // Actually dense_rank: increment only when score changes
    if (i > 0 && sorted[i].normalized_score !== sorted[i - 1].normalized_score) {
      currentRank = result[result.length - 1].rank + 1;
    }
    result.push({
      team_id: sorted[i].team_id,
      normalized_score: sorted[i].normalized_score,
      rank: i === 0 ? 1 : currentRank,
      submitted_at: sorted[i].submitted_at,
    });
  }

  return result;
}

// ── Competition Aggregation (Rank-Sum) ────────────────────

export interface TeamStanding {
  team_id: string;
  total_rank_sum: number;
  overall_rank: number;
  workout_ranks: Record<string, number>; // workout_id -> rank
  tie_broken_by: string | null;
}

export interface WorkoutRankMap {
  workout_id: string;
  ranks: RankedEntry[];
  scoringType: ScoringType;
}

/**
 * Compute overall competition standings using rank-sum method.
 * Lower total_rank_sum = better overall rank.
 */
export function computeStandings(
  workoutRanks: WorkoutRankMap[],
  tieBreakerPolicy: TieBreakerPolicy = 'best_final_round'
): TeamStanding[] {
  // Aggregate rank sums per team
  const teamSums = new Map<string, { total: number; ranks: Record<string, number>; bestSubmitted: string | null }>();

  for (const wr of workoutRanks) {
    for (const entry of wr.ranks) {
      const existing = teamSums.get(entry.team_id) ?? { total: 0, ranks: {}, bestSubmitted: null };
      existing.total += entry.rank;
      existing.ranks[wr.workout_id] = entry.rank;
      if (entry.submitted_at && (!existing.bestSubmitted || entry.submitted_at < existing.bestSubmitted)) {
        existing.bestSubmitted = entry.submitted_at;
      }
      teamSums.set(entry.team_id, existing);
    }
  }

  // Sort by total rank sum, then apply tie-breaker
  const teams = Array.from(teamSums.entries()).map(([team_id, data]) => ({
    team_id,
    ...data,
  }));

  teams.sort((a, b) => {
    const diff = a.total - b.total;
    if (diff !== 0) return diff;

    // Tie-breaker
    return applyTieBreaker(a, b, workoutRanks, tieBreakerPolicy);
  });

  // Assign overall ranks (dense)
  const standings: TeamStanding[] = [];
  let currentRank = 1;

  for (let i = 0; i < teams.length; i++) {
    if (i > 0 && teams[i].total !== teams[i - 1].total) {
      currentRank = standings[standings.length - 1].overall_rank + 1;
    }
    const tiedWithPrev = i > 0 && teams[i].total === teams[i - 1].total;
    standings.push({
      team_id: teams[i].team_id,
      total_rank_sum: teams[i].total,
      overall_rank: i === 0 ? 1 : (tiedWithPrev ? standings[i - 1].overall_rank : currentRank),
      workout_ranks: teams[i].ranks,
      tie_broken_by: null,
    });
  }

  return standings;
}

function applyTieBreaker(
  a: { total: number; ranks: Record<string, number>; bestSubmitted: string | null },
  b: { total: number; ranks: Record<string, number>; bestSubmitted: string | null },
  workoutRanks: WorkoutRankMap[],
  policy: TieBreakerPolicy
): number {
  switch (policy) {
    case 'best_final_round': {
      // Compare placement in the last workout
      const lastWr = workoutRanks[workoutRanks.length - 1];
      if (lastWr) {
        const aRank = a.ranks[lastWr.workout_id] ?? Infinity;
        const bRank = b.ranks[lastWr.workout_id] ?? Infinity;
        if (aRank !== bRank) return aRank - bRank;
      }
      break;
    }
    case 'best_single_workout': {
      // Compare best single workout rank
      const aBest = Math.min(...Object.values(a.ranks));
      const bBest = Math.min(...Object.values(b.ranks));
      if (aBest !== bBest) return aBest - bBest;
      break;
    }
    case 'earliest_submission': {
      if (a.bestSubmitted && b.bestSubmitted) {
        return a.bestSubmitted < b.bestSubmitted ? -1 : 1;
      }
      break;
    }
  }
  return 0;
}

// ── Tie Breakers & Partial "For Time" Completion ──────────
// Pure mirrors of the SQL used by recompute_workout_rankings and
// get_competition_leaderboard so the UI can rank optimistically.

export type WorkoutTieBreaker = 'none' | 'time';
export type GlobalTieBreaker = 'none' | 'most_wins_placements';

export interface WorkoutRankConfig {
  scoringType: ScoringType;
  /** Prescribed work for a "For Time" workout (reps, rounds, distance…). */
  targetWork?: number | null;
  tieBreaker?: WorkoutTieBreaker | null;
}

export interface WorkoutScoreInput {
  team_id: string;
  /** Raw primary value for the scoring type (seconds, reps, kg, points). */
  primary: number | null;
  /** Work completed — only meaningful for "For Time" with a target. */
  work_completed?: number | null;
  tie_breaker_seconds?: number | null;
}

export interface WorkoutRankResult {
  team_id: string;
  rank: number;
  /** True when the team met the prescribed target (always true without a target). */
  completed: boolean;
}

/** True when this workout records partial completion (For Time with a target). */
export function usesPartialCompletion(config: WorkoutRankConfig): boolean {
  return config.scoringType === 'time' && config.targetWork != null && config.targetWork > 0;
}

function sortKey(entry: WorkoutScoreInput, config: WorkoutRankConfig): number[] {
  const partial = usesPartialCompletion(config);
  const work = entry.work_completed ?? 0;
  const complete = partial ? work >= (config.targetWork as number) : true;

  // Lower is better for every element of the key.
  const completeKey = complete ? 0 : 1;

  let primaryKey: number;
  if (partial && !complete) {
    primaryKey = -work; // more work completed ranks higher
  } else if (config.scoringType === 'time') {
    primaryKey = entry.primary ?? Number.POSITIVE_INFINITY;
  } else {
    primaryKey = -(entry.primary ?? Number.NEGATIVE_INFINITY);
  }

  const tbKey =
    config.tieBreaker === 'time'
      ? entry.tie_breaker_seconds ?? Number.POSITIVE_INFINITY
      : 0;

  return [completeKey, primaryKey, tbKey];
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

/**
 * Rank teams for a single workout.
 * Order: completed teams first → primary metric → workout tie breaker.
 * Teams that cannot be separated share the same (dense) rank.
 */
export function rankWorkoutEntries(
  entries: WorkoutScoreInput[],
  config: WorkoutRankConfig
): WorkoutRankResult[] {
  const partial = usesPartialCompletion(config);
  const keyed = entries.map((e) => ({ entry: e, key: sortKey(e, config) }));
  keyed.sort((a, b) => compareKeys(a.key, b.key));

  const out: WorkoutRankResult[] = [];
  let rank = 0;
  keyed.forEach((k, i) => {
    if (i === 0 || compareKeys(k.key, keyed[i - 1].key) !== 0) rank += 1;
    out.push({
      team_id: k.entry.team_id,
      rank,
      completed: partial ? (k.entry.work_completed ?? 0) >= (config.targetWork as number) : true,
    });
  });
  return out;
}

export interface GlobalStandingInput {
  team_id: string;
  total_points: number;
  /** Count of 1st places at index 0, 2nd places at index 1, and so on. */
  placement_counts: number[];
}

/**
 * Compare two teams for overall standing.
 * Overall score first; the global tie breaker only runs on exact ties and
 * walks placements from best downward (most 1sts, then 2nds, then 3rds…).
 */
export function compareGlobalStandings(
  a: GlobalStandingInput,
  b: GlobalStandingInput,
  tieBreaker: GlobalTieBreaker
): number {
  if (a.total_points !== b.total_points) return b.total_points - a.total_points;
  if (tieBreaker !== 'most_wins_placements') return 0;

  const len = Math.max(a.placement_counts.length, b.placement_counts.length);
  for (let i = 0; i < len; i++) {
    const av = a.placement_counts[i] ?? 0;
    const bv = b.placement_counts[i] ?? 0;
    if (av !== bv) return bv - av; // more finishes at this placement ranks higher
  }
  return 0;
}

/** Order standings and assign shared (dense) overall ranks. */
export function rankGlobalStandings(
  standings: GlobalStandingInput[],
  tieBreaker: GlobalTieBreaker
): (GlobalStandingInput & { overall_rank: number })[] {
  const sorted = [...standings].sort((a, b) => compareGlobalStandings(a, b, tieBreaker));
  const out: (GlobalStandingInput & { overall_rank: number })[] = [];
  let rank = 0;
  sorted.forEach((s, i) => {
    if (i === 0 || compareGlobalStandings(s, sorted[i - 1], tieBreaker) !== 0) rank += 1;
    out.push({ ...s, overall_rank: rank });
  });
  return out;
}
