import { describe, it, expect } from "vitest";
import {
  usesPartialCompletion,
  rankWorkoutEntries,
  compareGlobalStandings,
  rankGlobalStandings,
} from "@/domain/engine";

describe("usesPartialCompletion", () => {
  it("is on only for For Time workouts with a target", () => {
    expect(usesPartialCompletion({ scoringType: "time", targetWork: 300 })).toBe(true);
    expect(usesPartialCompletion({ scoringType: "time", targetWork: null })).toBe(false);
    expect(usesPartialCompletion({ scoringType: "reps", targetWork: 300 })).toBe(false);
  });
});

describe("rankWorkoutEntries — For Time", () => {
  it("ranks fastest first when no target is set", () => {
    const ranks = rankWorkoutEntries(
      [
        { team_id: "slow", primary: 600 },
        { team_id: "fast", primary: 420 },
      ],
      { scoringType: "time" }
    );
    expect(ranks.map((r) => r.team_id)).toEqual(["fast", "slow"]);
  });

  it("places every finisher above every incomplete team", () => {
    const ranks = rankWorkoutEntries(
      [
        { team_id: "partial", primary: 900, work_completed: 290 },
        { team_id: "finished", primary: 880, work_completed: 300 },
      ],
      { scoringType: "time", targetWork: 300 }
    );
    expect(ranks[0]).toMatchObject({ team_id: "finished", rank: 1, completed: true });
    expect(ranks[1]).toMatchObject({ team_id: "partial", rank: 2, completed: false });
  });

  it("orders incomplete teams by most work completed", () => {
    const ranks = rankWorkoutEntries(
      [
        { team_id: "a", primary: 900, work_completed: 120 },
        { team_id: "b", primary: 900, work_completed: 250 },
      ],
      { scoringType: "time", targetWork: 300 }
    );
    expect(ranks.map((r) => r.team_id)).toEqual(["b", "a"]);
  });
});

describe("rankWorkoutEntries — workout tie breaker", () => {
  it("keeps identical results tied when the tie breaker is off", () => {
    const ranks = rankWorkoutEntries(
      [
        { team_id: "a", primary: 200, tie_breaker_seconds: 90 },
        { team_id: "b", primary: 200, tie_breaker_seconds: 60 },
      ],
      { scoringType: "reps", tieBreaker: "none" }
    );
    expect(ranks.every((r) => r.rank === 1)).toBe(true);
  });

  it("separates equal results by the quickest tie breaker time", () => {
    const ranks = rankWorkoutEntries(
      [
        { team_id: "a", primary: 200, tie_breaker_seconds: 90 },
        { team_id: "b", primary: 200, tie_breaker_seconds: 60 },
      ],
      { scoringType: "reps", tieBreaker: "time" }
    );
    expect(ranks).toEqual([
      { team_id: "b", rank: 1, completed: true },
      { team_id: "a", rank: 2, completed: true },
    ]);
  });

  it("never lets the tie breaker override the primary result", () => {
    const ranks = rankWorkoutEntries(
      [
        { team_id: "more", primary: 210, tie_breaker_seconds: 300 },
        { team_id: "less", primary: 190, tie_breaker_seconds: 10 },
      ],
      { scoringType: "reps", tieBreaker: "time" }
    );
    expect(ranks.map((r) => r.team_id)).toEqual(["more", "less"]);
  });
});

describe("global tie breaker", () => {
  it("leaves equal totals tied when set to none", () => {
    const ranked = rankGlobalStandings(
      [
        { team_id: "a", total_points: 190, placement_counts: [2, 0, 1] },
        { team_id: "b", total_points: 190, placement_counts: [0, 3, 0] },
      ],
      "none"
    );
    expect(ranked.every((r) => r.overall_rank === 1)).toBe(true);
  });

  it("breaks equal totals on most wins, then next placements", () => {
    const ranked = rankGlobalStandings(
      [
        { team_id: "a", total_points: 190, placement_counts: [1, 2, 0] },
        { team_id: "b", total_points: 190, placement_counts: [2, 0, 1] },
      ],
      "most_wins_placements"
    );
    expect(ranked.map((r) => r.team_id)).toEqual(["b", "a"]);
    expect(ranked.map((r) => r.overall_rank)).toEqual([1, 2]);
  });

  it("walks down placements when wins are equal", () => {
    expect(
      compareGlobalStandings(
        { team_id: "a", total_points: 100, placement_counts: [1, 1, 2] },
        { team_id: "b", total_points: 100, placement_counts: [1, 3, 0] },
        "most_wins_placements"
      )
    ).toBeGreaterThan(0);
  });

  it("still ranks by total points first", () => {
    const ranked = rankGlobalStandings(
      [
        { team_id: "low", total_points: 150, placement_counts: [5, 0] },
        { team_id: "high", total_points: 200, placement_counts: [0, 0] },
      ],
      "most_wins_placements"
    );
    expect(ranked[0].team_id).toBe("high");
  });
});
