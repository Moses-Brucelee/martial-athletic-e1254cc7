import { describe, it, expect } from "vitest";
import { validateTransition, type TransitionContext } from "@/modules/tournaments/statusValidation";

const base: TransitionContext = {
  name: "Test Comp",
  startDate: "2030-01-01T09:00:00.000Z",
  registrationDeadline: "2029-12-01T09:00:00.000Z",
  venue: "Main Box",
  posterUrl: "poster.jpg",
  divisionCount: 2,
  workoutCount: 3,
  registrationCount: 10,
  teamCount: 4,
  heatCount: 2,
  judgeCount: 2,
  scoreCount: 5,
  unlockedScoreCount: 0,
  now: new Date("2029-01-01T00:00:00.000Z"),
};

describe("validateTransition", () => {
  it("allows publishing a fully configured draft", () => {
    const v = validateTransition("draft", "published", base);
    expect(v.blockers).toEqual([]);
    expect(v.warnings).toEqual([]);
    expect(v.canProceed).toBe(true);
  });

  it("blocks publishing without divisions or start date", () => {
    const v = validateTransition("draft", "published", { ...base, divisionCount: 0, startDate: null });
    expect(v.canProceed).toBe(false);
    expect(v.blockers.length).toBe(2);
  });

  it("warns when publishing without workouts or poster", () => {
    const v = validateTransition("draft", "published", { ...base, workoutCount: 0, posterUrl: null });
    expect(v.canProceed).toBe(true);
    expect(v.warnings.length).toBe(2);
  });

  it("blocks going live without workouts or participants", () => {
    const v = validateTransition("published", "live", {
      ...base,
      workoutCount: 0,
      registrationCount: 0,
      teamCount: 0,
    });
    expect(v.canProceed).toBe(false);
    expect(v.blockers.length).toBe(2);
  });

  it("warns when going live before the start date and deadline", () => {
    const v = validateTransition("published", "live", base);
    expect(v.canProceed).toBe(true);
    expect(v.warnings.length).toBe(2);
  });

  it("never blocks completing but warns on unlocked scores", () => {
    const v = validateTransition("live", "completed", { ...base, unlockedScoreCount: 3 });
    expect(v.canProceed).toBe(true);
    expect(v.warnings).toContain("All scores are locked");
  });
});
