import { describe, it, expect } from "vitest";
import { globalTieBreakerLabels, workoutTieBreakerLabels } from "@/domain/tieBreakerDisplay";

describe("globalTieBreakerLabels", () => {
  const base = [
    { team_id: "a", division_key: "d", total_points: 10, placement_counts: [3, 1] },
    { team_id: "b", division_key: "d", total_points: 10, placement_counts: [2, 2] },
    { team_id: "c", division_key: "d", total_points: 9, placement_counts: [1] },
  ];
  it("labels only teams separated by the tie breaker", () => {
    const r = globalTieBreakerLabels(base, "most_wins_placements");
    expect(r.a.label).toBe("TB: 3 wins");
    expect(r.b.label).toBe("TB: 2 wins");
    expect(r.c).toBeUndefined();
  });
  it("returns nothing when disabled", () => {
    expect(globalTieBreakerLabels(base, "none")).toEqual({});
  });
  it("skips groups the tie breaker could not split", () => {
    const r = globalTieBreakerLabels(
      [
        { team_id: "a", division_key: "d", total_points: 5, placement_counts: [1] },
        { team_id: "b", division_key: "d", total_points: 5, placement_counts: [1] },
      ],
      "most_wins_placements"
    );
    expect(r).toEqual({});
  });
});

describe("workoutTieBreakerLabels", () => {
  it("labels equal primary scores with differing TB times", () => {
    const r = workoutTieBreakerLabels(
      [
        { team_id: "a", workout_id: "w", division_key: "d", primary: 300, tie_breaker_seconds: 522 },
        { team_id: "b", workout_id: "w", division_key: "d", primary: 300, tie_breaker_seconds: 555 },
        { team_id: "c", workout_id: "w", division_key: "d", primary: 280, tie_breaker_seconds: 400 },
      ],
      { w: "time" }
    );
    expect(r["a::w"]).toBe("TB: 08:42");
    expect(r["b::w"]).toBe("TB: 09:15");
    expect(r["c::w"]).toBeUndefined();
  });
});
