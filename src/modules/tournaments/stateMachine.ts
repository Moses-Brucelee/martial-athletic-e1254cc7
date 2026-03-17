// Date-driven competition lifecycle — no framework or DB imports

import type { Competition } from "@/domain/competition";

export type CompetitionStatus =
  | "draft"
  | "published"
  | "live"
  | "completed"
  | "expired";

export const STATUSES: CompetitionStatus[] = [
  "draft",
  "published",
  "live",
  "completed",
  "expired",
];

/**
 * Derive the competition status from its date fields and current time.
 * This mirrors the DB function `get_competition_status`.
 */
export function deriveStatus(comp: Competition): CompetitionStatus {
  const now = new Date();

  if (comp.status === "draft") return "draft";

  // Respect explicit DB status for live and completed — organizer manually advanced
  if (comp.status === "live") return "live";
  if (comp.status === "completed") return "completed";

  const endDate = comp.end_date ? new Date(comp.end_date) : null;
  const startDate = comp.start_date ? new Date(comp.start_date) : null;
  const regDeadline = comp.registration_deadline ? new Date(comp.registration_deadline) : null;

  if (endDate) {
    const expiry = new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (now > expiry) return "expired";
    if (now > endDate) return "completed";
  }

  if (startDate && now >= startDate && (!endDate || now <= endDate)) return "live";

  if (regDeadline && now < regDeadline) return "published";
  if (startDate && now < startDate) return "published";

  return comp.status as CompetitionStatus;
}

export function isMutable(status: CompetitionStatus): boolean {
  return status !== "completed" && status !== "expired";
}

export function getStatusLabel(status: CompetitionStatus): string {
  const labels: Record<CompetitionStatus, string> = {
    draft: "Draft",
    published: "Published",
    live: "Live",
    completed: "Completed",
    expired: "Expired",
  };
  return labels[status] ?? status;
}

export function getStatusIndex(status: CompetitionStatus): number {
  return STATUSES.indexOf(status);
}

export function getStatusColor(status: CompetitionStatus): string {
  switch (status) {
    case "draft": return "bg-muted text-muted-foreground";
    case "published": return "bg-primary/20 text-primary";
    case "live": return "bg-green-500/20 text-green-700 dark:text-green-400";
    case "completed": return "bg-accent/20 text-accent-foreground";
    case "expired": return "bg-destructive/20 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}
