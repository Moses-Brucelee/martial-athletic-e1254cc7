export type { Participant, Athlete, AthleteRegistration } from "@/domain/competition";

export const REGISTRATION_STATUSES = [
  "draft",
  "pending",
  "approved",
  "waitlist",
  "rejected",
  "withdrawn",
  "removed",
  "disqualified",
] as const;

export type RegistrationStatus = typeof REGISTRATION_STATUSES[number];

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  waitlist: "Waitlisted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  removed: "Removed",
  disqualified: "Disqualified",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "text-muted-foreground bg-muted/50",
  pending: "text-yellow-600 bg-yellow-500/10",
  approved: "text-green-600 bg-green-500/10",
  waitlist: "text-blue-600 bg-blue-500/10",
  rejected: "text-destructive bg-destructive/10",
  withdrawn: "text-muted-foreground bg-muted/30",
  removed: "text-destructive bg-destructive/10",
  disqualified: "text-destructive bg-destructive/20",
};
