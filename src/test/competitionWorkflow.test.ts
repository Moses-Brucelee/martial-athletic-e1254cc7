import { describe, expect, it } from "vitest";
import { getCompetitionWorkflowRecommendation } from "@/modules/tournaments/competitionWorkflow";

const context = {
  status: "draft" as const,
  workoutCount: 3,
  eligibleEntrantCount: 8,
  heatCount: 4,
  completedScoreCount: 0,
};

describe("getCompetitionWorkflowRecommendation", () => {
  it("guides an empty draft to workouts", () => {
    expect(getCompetitionWorkflowRecommendation({ ...context, workoutCount: 0 }).section).toBe("workouts");
  });

  it("guides a draft with workouts to people", () => {
    expect(getCompetitionWorkflowRecommendation({ ...context, eligibleEntrantCount: 0 }).section).toBe("people");
  });

  it("guides a populated draft to heats", () => {
    expect(getCompetitionWorkflowRecommendation({ ...context, heatCount: 0 }).section).toBe("heats");
  });

  it("offers publishing when draft setup is ready", () => {
    expect(getCompetitionWorkflowRecommendation(context)).toMatchObject({ section: "overview", action: "publish" });
  });

  it("guides a published competition without heats to heats", () => {
    expect(getCompetitionWorkflowRecommendation({ ...context, status: "published", heatCount: 0 }).section).toBe("heats");
  });

  it("guides active partial scoring to scoring", () => {
    expect(getCompetitionWorkflowRecommendation({ ...context, status: "live", completedScoreCount: 23 }).section).toBe("scoring");
  });

  it("guides complete team scoring to the leaderboard", () => {
    expect(getCompetitionWorkflowRecommendation({ ...context, status: "live", completedScoreCount: 24 }).section).toBe("leaderboard");
  });

  it("counts solo entrants when deciding scoring completion", () => {
    expect(getCompetitionWorkflowRecommendation({ ...context, status: "live", eligibleEntrantCount: 2, completedScoreCount: 6 }).section).toBe("leaderboard");
  });

  it("defaults finished competitions to the leaderboard", () => {
    expect(getCompetitionWorkflowRecommendation({ ...context, status: "completed" }).section).toBe("leaderboard");
  });
});