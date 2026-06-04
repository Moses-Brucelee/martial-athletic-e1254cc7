import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Crown,
  Trophy,
  ChevronDown,
  ChevronUp,
  Lock,
  Settings2,
  UsersRound,
  CheckCircle2,
  Clock,
  Timer,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import { useTeams, useDivisions } from "@/modules/tournaments/hooks";
import { useRegistrations } from "@/modules/athletes/hooks";
import { useLeaderboard } from "@/modules/leaderboard/hooks";
import { deriveStatus } from "@/modules/tournaments/stateMachine";
import { RegistrationManager } from "@/modules/athletes/components/RegistrationManager";

interface RegistrationTeamsViewProps {
  competitionId: string;
  competition: any;
  canAdmin: boolean;
  registrationOpen: boolean;
}

/**
 * Unified Registration + Teams view.
 * - Status summary across the top
 * - Grouped Division → Teams → Athletes layout
 * - Inline management when registration is open
 */
export function RegistrationTeamsView({
  competitionId,
  competition,
  canAdmin,
  registrationOpen,
}: RegistrationTeamsViewProps) {
  const { data: teams = [], isLoading: teamsLoading } = useTeams(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const { data: registrations = [], isLoading: regLoading } = useRegistrations(competitionId);

  const status = competition ? deriveStatus(competition) : "draft";
  const useLb = status === "live" || status === "completed";
  const { data: leaderboard = [] } = useLeaderboard(useLb ? competitionId : undefined);

  const [manageOpen, setManageOpen] = useState(false);

  const pointsMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of leaderboard) m.set(e.team_id, e.total_points);
    return m;
  }, [leaderboard]);

  const divMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of divisions) m.set(d.id, d.name);
    return m;
  }, [divisions]);

  // Counts for summary header
  const counts = useMemo(() => {
    const total = registrations.length;
    const approved = registrations.filter((r) => r.status === "approved").length;
    const waitlist = registrations.filter((r) => r.status === "waitlist").length;
    const pending = registrations.filter((r) => r.status === "pending").length;
    return { total, approved, waitlist, pending };
  }, [registrations]);

  // Group teams under divisions
  const grouped = useMemo(() => {
    const sortedTeams = [...teams].sort((a, b) => {
      if (useLb) {
        return (pointsMap.get(b.id) ?? 0) - (pointsMap.get(a.id) ?? 0);
      }
      return (
        new Date(a.created_at ?? 0).getTime() -
        new Date(b.created_at ?? 0).getTime()
      );
    });

    const byDiv = new Map<
      string,
      { divisionId: string | null; divisionName: string; teams: typeof teams }
    >();
    for (const t of sortedTeams) {
      const key = t.division_id || t.division || "__nodiv__";
      const name =
        (t.division_id && divMap.get(t.division_id)) ||
        t.division ||
        "No Division";
      if (!byDiv.has(key)) {
        byDiv.set(key, {
          divisionId: t.division_id ?? null,
          divisionName: name,
          teams: [],
        });
      }
      byDiv.get(key)!.teams.push(t);
    }

    // Solo registrations (no team)
    const soloRegs = registrations.filter(
      (r) =>
        !r.team_id &&
        r.status !== "removed" &&
        r.status !== "withdrawn" &&
        r.status !== "rejected"
    );
    if (soloRegs.length > 0) {
      // group solo by division
      for (const r of soloRegs) {
        const divName =
          (r.division_id && divMap.get(r.division_id)) || "Individual";
        const key = r.division_id || "__solo__";
        if (!byDiv.has(key)) {
          byDiv.set(key, {
            divisionId: r.division_id ?? null,
            divisionName: divName,
            teams: [],
          });
        }
      }
    }

    return Array.from(byDiv.values()).sort((a, b) =>
      a.divisionName.localeCompare(b.divisionName)
    );
  }, [teams, registrations, useLb, pointsMap, divMap]);

  const soloByDivision = useMemo(() => {
    const m = new Map<string, typeof registrations>();
    for (const r of registrations) {
      if (r.team_id) continue;
      if (
        r.status === "removed" ||
        r.status === "withdrawn" ||
        r.status === "rejected"
      )
        continue;
      const key = r.division_id || "__solo__";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return m;
  }, [registrations]);

  const isLoading = teamsLoading || regLoading;

  return (
    <div className="space-y-6">
      {/* CTA — route to public event page to complete registration */}
      {registrationOpen && (
        <RegisterCta competitionId={competitionId} />
      )}


      {/* Closed banner */}
      {!registrationOpen && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
          <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">
            Registrations are closed. The roster below is read-only.
          </p>
        </div>
      )}

      {/* Grouped division → teams → athletes */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No teams or athletes registered yet.
            </p>
          </div>
        ) : (
          grouped.map((group) => {
            const solos =
              soloByDivision.get(
                group.divisionId || (group.divisionName === "Individual" ? "__solo__" : "__solo__")
              ) || [];
            if (group.teams.length === 0 && solos.length === 0) return null;
            return (
              <section key={group.divisionName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-8 bg-primary rounded-full" />
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                    {group.divisionName}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({group.teams.length}{" "}
                    {group.teams.length === 1 ? "team" : "teams"}
                    {solos.length > 0
                      ? ` · ${solos.length} solo`
                      : ""}
                    )
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.teams.map((team, idx) => {
                    const members = registrations.filter(
                      (r) =>
                        r.team_id === team.id &&
                        r.status !== "removed" &&
                        r.status !== "withdrawn" &&
                        r.status !== "rejected"
                    );
                    const points = pointsMap.get(team.id);
                    const rankColor =
                      useLb && idx === 0
                        ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
                        : useLb && idx === 1
                        ? "bg-zinc-400/15 text-zinc-600 dark:text-zinc-300 border-zinc-400/30"
                        : useLb && idx === 2
                        ? "bg-amber-700/15 text-amber-700 dark:text-amber-500 border-amber-700/30"
                        : "bg-muted text-muted-foreground border-border";

                    return (
                      <div
                        key={team.id}
                        className="bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-center gap-3 p-3 border-b border-border bg-background/50">
                          <div
                            className={`flex items-center justify-center h-9 w-9 rounded-lg border font-black text-xs shrink-0 ${rankColor}`}
                          >
                            {useLb ? idx + 1 : `#${idx + 1}`}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground text-sm uppercase tracking-tight truncate">
                              {team.team_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {members.length}{" "}
                              {members.length === 1 ? "athlete" : "athletes"}
                            </p>
                          </div>
                          {useLb && points !== undefined && (
                            <div className="flex items-center gap-1 text-primary shrink-0">
                              <Trophy className="h-3.5 w-3.5" />
                              <span className="text-sm font-bold">{points}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-2 space-y-1 flex-1">
                          {members.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic px-2 py-2">
                              No members yet
                            </p>
                          ) : (
                            members.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
                              >
                                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 uppercase">
                                  {m.athlete_name?.[0] ?? "?"}
                                </div>
                                <span className="text-sm text-foreground truncate flex-1">
                                  {m.athlete_name}
                                </span>
                                <StatusBadge status={m.status} />
                                {m.registration_type === "team_captain" && (
                                  <Crown
                                    className="h-3.5 w-3.5 text-primary shrink-0"
                                    aria-label="Captain"
                                  />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Solo athletes for this division */}
                  {solos.length > 0 && (
                    <div className="bg-card border border-dashed border-border rounded-xl overflow-hidden flex flex-col">
                      <div className="flex items-center gap-2 p-3 border-b border-border bg-background/50">
                        <UsersRound className="h-4 w-4 text-muted-foreground" />
                        <p className="font-bold text-foreground text-sm uppercase tracking-tight">
                          Individual Athletes
                        </p>
                      </div>
                      <div className="p-2 space-y-1 flex-1">
                        {solos.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
                          >
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 uppercase">
                              {m.athlete_name?.[0] ?? "?"}
                            </div>
                            <span className="text-sm text-foreground truncate flex-1">
                              {m.athlete_name}
                            </span>
                            <StatusBadge status={m.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Manage panel (collapsible) — only for admins while registration is open */}
      {registrationOpen && canAdmin && (
        <div className="bg-card border border-border rounded-xl">
          <button
            type="button"
            onClick={() => setManageOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
              <Settings2 className="h-4 w-4 text-primary" />
              Manage Registrations & Teams
            </span>
            {manageOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {manageOpen && (
            <div className="border-t border-border p-4">
              <RegistrationManager competitionId={competitionId} canAdmin={canAdmin} />
            </div>
          )}
        </div>
      )}

      {/* Inline summary metrics */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 border-t border-border text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <UsersRound className="h-4 w-4 text-primary" />
          <span className="font-bold text-foreground">{counts.total}</span> Total
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="font-bold text-foreground">{counts.approved}</span> Approved
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="font-bold text-foreground">{counts.waitlist}</span> Waitlist
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Timer className="h-4 w-4 text-amber-500" />
          <span className="font-bold text-foreground">{counts.pending}</span> Pending
        </span>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">{icon}</div>
      <p className="text-2xl font-black text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        {label}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: {
      label: "Approved",
      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    },
    pending: {
      label: "Pending",
      cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    },
    waitlist: {
      label: "Waitlist",
      cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    },
    rejected: {
      label: "Rejected",
      cls: "bg-destructive/15 text-destructive border-destructive/30",
    },
  };
  const entry = map[status];
  if (!entry) return null;
  return (
    <Badge variant="outline" className={`text-[10px] ${entry.cls}`}>
      {entry.label}
    </Badge>
  );
}
