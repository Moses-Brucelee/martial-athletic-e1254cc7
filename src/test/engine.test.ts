import { describe, it, expect } from "vitest";
import {
  normalizeScore,
  computeRanks,
  computeStandings,
  defaultScoringType,
  isLowerBetter,
  type RawScore,
  type NormalizedEntry,
  type WorkoutRankMap,
} from "@/domain/engine";

describe("defaultScoringType", () => {
  it("maps amrap to reps", () => expect(defaultScoringType("amrap")).toBe("reps"));
  it("maps for_time to time", () => expect(defaultScoringType("for_time")).toBe("time"));
  it("maps max_load to load", () => expect(defaultScoringType("max_load")).toBe("load"));
  it("maps custom to points", () => expect(defaultScoringType("custom")).toBe("points"));
});

describe("isLowerBetter", () => {
  it("time is lower-better", () => expect(isLowerBetter("time")).toBe(true));
  it("reps is NOT lower-better", () => expect(isLowerBetter("reps")).toBe(false));
  it("load is NOT lower-better", () => expect(isLowerBetter("load")).toBe(false));
});

describe("normalizeScore", () => {
  const baseRaw: RawScore = { team_id: "t1", score: 100 };

  it("uses time_seconds for time scoring", () => {
    const raw = { ...baseRaw, time_seconds: 180 };
    expect(normalizeScore(raw, "time")).toBe(180);
  });

  it("uses reps_completed for reps scoring", () => {
    const raw = { ...baseRaw, reps_completed: 42 };
    expect(normalizeScore(raw, "reps")).toBe(42);
  });

  it("uses load_value for load scoring", () => {
    const raw = { ...baseRaw, load_value: 120.5 };
    expect(normalizeScore(raw, "load")).toBe(120.5);
  });

  it("falls back to score when raw field is null", () => {
    expect(normalizeScore(baseRaw, "reps")).toBe(100);
  });

  it("penalizes non-finishers in time-capped workouts", () => {
    const raw: RawScore = { team_id: "t1", score: 0, time_seconds: 0 };
    expect(normalizeScore(raw, "time", 600)).toBe(660); // cap + 60s penalty
  });
});

describe("computeRanks", () => {
  it("ranks time ascending (lower is better)", () => {
    const entries: NormalizedEntry[] = [
      { team_id: "a", normalized_score: 300, submitted_at: null },
      { team_id: "b", normalized_score: 180, submitted_at: null },
      { team_id: "c", normalized_score: 240, submitted_at: null },
    ];
    const ranked = computeRanks(entries, "time");
    expect(ranked[0]).toMatchObject({ team_id: "b", rank: 1 });
    expect(ranked[1]).toMatchObject({ team_id: "c", rank: 2 });
    expect(ranked[2]).toMatchObject({ team_id: "a", rank: 3 });
  });

  it("ranks reps descending (higher is better)", () => {
    const entries: NormalizedEntry[] = [
      { team_id: "a", normalized_score: 50, submitted_at: null },
      { team_id: "b", normalized_score: 80, submitted_at: null },
      { team_id: "c", normalized_score: 80, submitted_at: null },
    ];
    const ranked = computeRanks(entries, "reps");
    expect(ranked[0]).toMatchObject({ team_id: "b", rank: 1 });
    expect(ranked[1]).toMatchObject({ team_id: "c", rank: 1 }); // tie
    expect(ranked[2]).toMatchObject({ team_id: "a", rank: 2 }); // dense rank
  });

  it("handles single entry", () => {
    const entries: NormalizedEntry[] = [
      { team_id: "solo", normalized_score: 42, submitted_at: null },
    ];
    const ranked = computeRanks(entries, "points");
    expect(ranked).toHaveLength(1);
    expect(ranked[0]).toMatchObject({ team_id: "solo", rank: 1 });
  });
});

describe("computeStandings", () => {
  it("computes rank-sum standings across workouts", () => {
    const wod1: WorkoutRankMap = {
      workout_id: "w1",
      scoringType: "reps",
      ranks: [
        { team_id: "a", normalized_score: 80, rank: 1, submitted_at: null },
        { team_id: "b", normalized_score: 60, rank: 2, submitted_at: null },
        { team_id: "c", normalized_score: 40, rank: 3, submitted_at: null },
      ],
    };
    const wod2: WorkoutRankMap = {
      workout_id: "w2",
      scoringType: "time",
      ranks: [
        { team_id: "a", normalized_score: 300, rank: 3, submitted_at: null },
        { team_id: "b", normalized_score: 200, rank: 2, submitted_at: null },
        { team_id: "c", normalized_score: 180, rank: 1, submitted_at: null },
      ],
    };

    const standings = computeStandings([wod1, wod2]);
    
    // a: 1+3=4, b: 2+2=4, c: 3+1=4 — all tied at 4
    // With best_final_round tie-breaker, c wins (rank 1 in last WOD)
    expect(standings[0].team_id).toBe("c");
    expect(standings[0].total_rank_sum).toBe(4);
  });

  it("orders by rank-sum first, tie-breaker second", () => {
    const wod1: WorkoutRankMap = {
      workout_id: "w1",
      scoringType: "reps",
      ranks: [
        { team_id: "a", normalized_score: 100, rank: 1, submitted_at: null },
        { team_id: "b", normalized_score: 50, rank: 2, submitted_at: null },
      ],
    };
    const wod2: WorkoutRankMap = {
      workout_id: "w2",
      scoringType: "reps",
      ranks: [
        { team_id: "a", normalized_score: 90, rank: 1, submitted_at: null },
        { team_id: "b", normalized_score: 45, rank: 2, submitted_at: null },
      ],
    };

    const standings = computeStandings([wod1, wod2]);
    // a: 1+1=2, b: 2+2=4 — a wins clearly
    expect(standings[0].team_id).toBe("a");
    expect(standings[0].overall_rank).toBe(1);
    expect(standings[1].team_id).toBe("b");
    expect(standings[1].overall_rank).toBe(2);
  });

  it("handles empty workout ranks", () => {
    const standings = computeStandings([]);
    expect(standings).toHaveLength(0);
  });
});
