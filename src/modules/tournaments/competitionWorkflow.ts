import type { CompetitionStatus } from "@/modules/tournaments/stateMachine";

export type CompetitionWorkflowSection =
  | "overview"
  | "workouts"
  | "people"
  | "heats"
  | "scoring"
  | "leaderboard";

export interface CompetitionWorkflowContext {
  status: CompetitionStatus;
  workoutCount: number;
  eligibleEntrantCount: number;
  heatCount: number;
  completedScoreCount: number;
}

export interface CompetitionWorkflowRecommendation {
  section: CompetitionWorkflowSection;
  label: string;
  actionLabel: string;
  action: "navigate" | "publish";
}

export function getCompetitionWorkflowRecommendation(
  context: CompetitionWorkflowContext,
): CompetitionWorkflowRecommendation {
  const { status, workoutCount, eligibleEntrantCount, heatCount, completedScoreCount } = context;

  if (status === "completed" || status === "expired") {
    return { section: "leaderboard", label: "Competition finished", actionLabel: "View Leaderboard", action: "navigate" };
  }

  if (status === "live") {
    const expectedScores = workoutCount * eligibleEntrantCount;
    const scoresComplete = expectedScores > 0 && completedScoreCount >= expectedScores;
    return scoresComplete
      ? { section: "leaderboard", label: "Scores Complete", actionLabel: "View Leaderboard", action: "navigate" }
      : { section: "scoring", label: "Competition Live", actionLabel: "Go to Scoring", action: "navigate" };
  }

  if (status === "published") {
    return heatCount === 0
      ? { section: "heats", label: "Next: Configure Heats", actionLabel: "Manage Heats", action: "navigate" }
      : { section: "overview", label: "Competition Published", actionLabel: "View Overview", action: "navigate" };
  }

  if (workoutCount === 0) {
    return { section: "workouts", label: "Next: Create Workouts", actionLabel: "Create Workouts", action: "navigate" };
  }
  if (eligibleEntrantCount === 0) {
    return { section: "people", label: "Next: Add People / Teams", actionLabel: "Manage People", action: "navigate" };
  }
  if (heatCount === 0) {
    return { section: "heats", label: "Next: Configure Heats", actionLabel: "Manage Heats", action: "navigate" };
  }
  return { section: "overview", label: "Competition Ready", actionLabel: "Publish Competition", action: "publish" };
}
