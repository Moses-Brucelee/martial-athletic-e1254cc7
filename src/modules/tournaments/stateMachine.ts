// Pure tournament lifecycle state machine — no framework or DB imports

export type CompetitionStatus =
  | "draft"
  | "registration"
  | "seeding"
  | "in_progress"
  | "completed";

export const STATUSES: CompetitionStatus[] = [
  "draft",
  "registration",
  "seeding",
  "in_progress",
  "completed",
];

export interface TransitionContext {
  teamCount: number;
  workoutCount: number;
  participantCount: number;
  bracketCount: number;
  allBoutsResolved: boolean;
  isAdmin: boolean;
}

interface TransitionRule {
  to: CompetitionStatus;
  check: (ctx: TransitionContext) => string | null; // null = allowed, string = reason blocked
}

const FORWARD_TRANSITIONS: Record<string, TransitionRule[]> = {
  draft: [
    {
      to: "registration",
      check: (ctx) => {
        if (ctx.teamCount < 1) return "At least 1 team is required";
        if (ctx.workoutCount < 1) return "At least 1 workout is required";
        return null;
      },
    },
  ],
  registration: [
    {
      to: "seeding",
      check: (ctx) => {
        if (ctx.participantCount < 2)
          return "At least 2 registered participants are required";
        return null;
      },
    },
  ],
  seeding: [
    {
      to: "in_progress",
      check: (ctx) => {
        if (ctx.bracketCount < 1) return "Brackets must be generated first";
        return null;
      },
    },
  ],
  in_progress: [
    {
      to: "completed",
      check: (ctx) => {
        if (!ctx.allBoutsResolved)
          return "All bouts must be resolved or use manual override";
        return null;
      },
    },
  ],
};

const BACKWARD_TRANSITIONS: Record<string, CompetitionStatus[]> = {
  registration: ["draft"],
  seeding: ["registration"],
};

export function getAvailableTransitions(
  status: CompetitionStatus,
  ctx: TransitionContext,
): { to: CompetitionStatus; blocked: string | null }[] {
  const results: { to: CompetitionStatus; blocked: string | null }[] = [];

  // Forward
  const forward = FORWARD_TRANSITIONS[status] ?? [];
  for (const rule of forward) {
    results.push({ to: rule.to, blocked: rule.check(ctx) });
  }

  // Backward (admin only)
  if (ctx.isAdmin) {
    const backward = BACKWARD_TRANSITIONS[status] ?? [];
    for (const to of backward) {
      results.push({ to, blocked: null });
    }
  }

  return results;
}

export function canTransition(
  from: CompetitionStatus,
  to: CompetitionStatus,
  ctx: TransitionContext,
): { allowed: boolean; reason?: string } {
  const available = getAvailableTransitions(from, ctx);
  const match = available.find((t) => t.to === to);
  if (!match) return { allowed: false, reason: "Invalid transition" };
  if (match.blocked) return { allowed: false, reason: match.blocked };
  return { allowed: true };
}

export function getStatusLabel(status: CompetitionStatus): string {
  const labels: Record<CompetitionStatus, string> = {
    draft: "Draft",
    registration: "Registration",
    seeding: "Seeding",
    in_progress: "In Progress",
    completed: "Completed",
  };
  return labels[status] ?? status;
}

export function getStatusIndex(status: CompetitionStatus): number {
  return STATUSES.indexOf(status);
}
