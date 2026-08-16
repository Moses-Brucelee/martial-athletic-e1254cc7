// Pure readiness validation for competition status transitions.
// No framework or DB imports — unit-testable.

import type { CompetitionStatus } from "./stateMachine";

export interface TransitionContext {
  name: string | null;
  startDate: string | null;
  registrationDeadline: string | null;
  venue: string | null;
  posterUrl: string | null;
  divisionCount: number;
  workoutCount: number;
  registrationCount: number;
  teamCount: number;
  heatCount: number;
  judgeCount: number;
  scoreCount: number;
  unlockedScoreCount: number;
  now?: Date;
}

export interface TransitionCheck {
  label: string;
  level: "blocker" | "warning";
  passed: boolean;
}

export interface TransitionValidation {
  title: string;
  description: string;
  confirmLabel: string;
  checks: TransitionCheck[];
  blockers: string[];
  warnings: string[];
  canProceed: boolean;
}

const COPY: Record<string, { title: string; description: string; confirmLabel: string }> = {
  "draft>published": {
    title: "Publish this competition?",
    description:
      "The competition becomes publicly visible and registration opens. Core setup (sport type and format) can no longer be changed freely.",
    confirmLabel: "Publish Competition",
  },
  "published>live": {
    title: "Take this competition live?",
    description:
      "Judges and organizers can start submitting scores, and the leaderboard and heats become visible to everyone.",
    confirmLabel: "Go Live",
  },
  "live>completed": {
    title: "Mark this competition as completed?",
    description:
      "All scores are locked and final standings are published. Reversing this requires a super-user override.",
    confirmLabel: "Mark Completed",
  },
};

function build(checks: TransitionCheck[], key: string): TransitionValidation {
  const copy = COPY[key] ?? {
    title: "Change competition status?",
    description: "Confirm this status change.",
    confirmLabel: "Confirm",
  };
  const blockers = checks.filter((c) => c.level === "blocker" && !c.passed).map((c) => c.label);
  const warnings = checks.filter((c) => c.level === "warning" && !c.passed).map((c) => c.label);
  return { ...copy, checks, blockers, warnings, canProceed: blockers.length === 0 };
}

export function validateTransition(
  from: CompetitionStatus,
  to: CompetitionStatus,
  ctx: TransitionContext
): TransitionValidation {
  const key = `${from}>${to}`;
  const now = ctx.now ?? new Date();
  const start = ctx.startDate ? new Date(ctx.startDate) : null;
  const deadline = ctx.registrationDeadline ? new Date(ctx.registrationDeadline) : null;

  if (key === "draft>published") {
    return build(
      [
        { label: "Competition has a name", level: "blocker", passed: !!ctx.name?.trim() },
        { label: "Start date is set", level: "blocker", passed: !!ctx.startDate },
        { label: "At least one division is configured", level: "blocker", passed: ctx.divisionCount > 0 },
        {
          label: "Registration deadline is set (athletes cannot register without it)",
          level: "blocker",
          passed: !!ctx.registrationDeadline,
        },
        {
          label: "Registration deadline is before the start date",
          level: "blocker",
          passed: !deadline || !start || deadline <= start,
        },
        {
          label: "Registration deadline is still in the future",
          level: "warning",
          passed: !deadline || deadline > now,
        },
        { label: "At least one workout is added", level: "warning", passed: ctx.workoutCount > 0 },
        { label: "Venue is set", level: "warning", passed: !!ctx.venue?.trim() },
        { label: "Poster uploaded", level: "warning", passed: !!ctx.posterUrl },
      ],
      key
    );
  }


  if (key === "published>live") {
    return build(
      [
        { label: "At least one workout is added", level: "blocker", passed: ctx.workoutCount > 0 },
        {
          label: "At least one registration or team exists",
          level: "blocker",
          passed: ctx.registrationCount > 0 || ctx.teamCount > 0,
        },
        { label: "Heats are scheduled", level: "warning", passed: ctx.heatCount > 0 },
        { label: "Judges are assigned", level: "warning", passed: ctx.judgeCount > 0 },
        {
          label: "Registration deadline has passed",
          level: "warning",
          passed: !deadline || deadline <= now,
        },
        { label: "Start date has arrived", level: "warning", passed: !start || start <= now },
      ],
      key
    );
  }

  if (key === "live>completed") {
    return build(
      [
        { label: "Scores have been captured", level: "warning", passed: ctx.scoreCount > 0 },
        {
          label: "All workouts have at least one score",
          level: "warning",
          passed: ctx.workoutCount === 0 || ctx.scoreCount >= ctx.workoutCount,
        },
        { label: "All scores are locked", level: "warning", passed: ctx.unlockedScoreCount === 0 },
      ],
      key
    );
  }

  return build([], key);
}
