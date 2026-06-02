import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Crown } from "lucide-react";
import { useTeams, useDivisions } from "@/modules/tournaments/hooks";
import { useRegistrations } from "@/modules/athletes/hooks";
import { useLeaderboard } from "@/modules/leaderboard/hooks";
import { deriveStatus } from "@/modules/tournaments/stateMachine";

interface PublicTeamsViewProps {
  competitionId: string;
  competition: any;
}

/**
 * Leaderboard-style team display for public/viewer experience.
 * - When live or completed: orders by current leaderboard points.
 * - Pre-live (published): orders by registration order (created_at).
 * - Always groups athletes under their team with division badge + captain marker.
 */
export function PublicTeamsView({ competitionId, competition }: PublicTeamsViewProps) {
  const { data: teams = [], isLoading: teamsLoading } = useTeams(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const { data: registrations = [] } = useRegistrations(competitionId);
  const status = competition ? deriveStatus(competition) : "draft";
  const useLb = status === "live" || status === "completed";
  const { data: leaderboard = [] } = useLeaderboard(useLb ? competitionId : undefined);

  const rankedTeams = useMemo(() => {
    if (!useLb || leaderboard.length === 0) {
      return [...teams].sort((a, b) =>
        new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
      );
    }
    const pointsMap = new Map<string, number>();
    for (const entry of leaderboard) pointsMap.set(entry.team_id, entry.total_points);
    return [...teams].sort((a, b) => (pointsMap.get(b.id) ?? 0) - (pointsMap.get(a.id) ?? 0));
  }, [teams, leaderboard, useLb]);

  const pointsMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const entry of leaderboard) m.set(entry.team_id, entry.total_points);
    return m;
  }, [leaderboard]);

  const divMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of divisions) m.set(d.id, d.name);
    return m;
  }, [divisions]);

  if (teamsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (rankedTeams.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No teams registered yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rankedTeams.map((team, idx) => {
        const members = registrations.filter(
          (r) =>
            r.team_id === team.id &&
            r.status !== "removed" &&
            r.status !== "withdrawn" &&
            r.status !== "rejected"
        );
        const points = pointsMap.get(team.id);
        const divisionName =
          (team.division_id && divMap.get(team.division_id)) || team.division || null;
        const rankBadgeColor =
          idx === 0
            ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
            : idx === 1
            ? "bg-zinc-400/15 text-zinc-600 dark:text-zinc-300 border-zinc-400/30"
            : idx === 2
            ? "bg-amber-700/15 text-amber-700 dark:text-amber-500 border-amber-700/30"
            : "bg-muted text-muted-foreground border-border";

        return (
          <div
            key={team.id}
            className="bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-lg transition-all"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-background/50">
              <div
                className={`flex items-center justify-center h-10 w-10 rounded-lg border font-black text-sm shrink-0 ${rankBadgeColor}`}
              >
                {useLb && points !== undefined ? idx + 1 : `#${idx + 1}`}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-foreground text-sm uppercase tracking-tight truncate">
                  {team.team_name}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {divisionName && (
                    <Badge variant="outline" className="text-[10px]">
                      {divisionName}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {members.length} {members.length === 1 ? "athlete" : "athletes"}
                  </span>
                </div>
              </div>
              {useLb && points !== undefined && (
                <div className="flex items-center gap-1 text-primary shrink-0">
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="text-sm font-bold">{points}</span>
                </div>
              )}
            </div>

            {/* Members */}
            <div className="p-3 space-y-1 flex-1">
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1 py-2">
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
    </div>
  );
}
