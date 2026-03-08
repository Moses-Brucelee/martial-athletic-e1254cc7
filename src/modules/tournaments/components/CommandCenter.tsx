import { useMemo } from "react";
import { Activity, Users, Flame, BarChart3, Shield, Clock, Zap } from "lucide-react";
import { useTeams, useWorkouts } from "@/modules/tournaments/hooks";
import { useScores } from "@/modules/scoring/hooks";
import { useHeats } from "@/modules/tournaments/hooks-engine";
import { useLeaderboard } from "@/modules/leaderboard/hooks";
import { ValidationQueue } from "@/modules/scoring/components/ValidationQueue";
import { LeaderboardPanel } from "@/modules/leaderboard/components/LeaderboardPanel";
import { Badge } from "@/components/ui/badge";

interface CommandCenterProps {
  competitionId: string;
}

export function CommandCenter({ competitionId }: CommandCenterProps) {
  const { data: teams = [] } = useTeams(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: scoreRows = [] } = useScores(competitionId);
  const { data: heats = [] } = useHeats(competitionId);
  const { data: leaderboardEntries = [] } = useLeaderboard(competitionId);

  const stats = useMemo(() => {
    const totalPossible = teams.length * workouts.length;
    const submitted = scoreRows.length;
    const validated = scoreRows.filter((s) => s.validation_status === "validated").length;
    const pending = scoreRows.filter((s) => !s.validation_status || s.validation_status === "pending").length;
    const lockedWorkouts = workouts.filter((w) => w.is_locked).length;
    const activeHeats = heats.filter((h) => h.status === "active").length;
    const completedHeats = heats.filter((h) => h.status === "completed").length;
    const upcomingHeats = heats.filter((h) => h.status === "pending" || h.status === "scheduled").length;

    return { totalPossible, submitted, validated, pending, lockedWorkouts, totalWorkouts: workouts.length,
             activeHeats, completedHeats, upcomingHeats, totalHeats: heats.length };
  }, [teams, workouts, scoreRows, heats]);

  const completionPct = stats.totalPossible > 0
    ? Math.round((stats.submitted / stats.totalPossible) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Athletes" value={teams.length} />
        <StatCard icon={Flame} label="Workouts" value={`${stats.lockedWorkouts}/${stats.totalWorkouts}`} sub="locked" />
        <StatCard icon={BarChart3} label="Scores" value={`${completionPct}%`} sub={`${stats.submitted}/${stats.totalPossible}`} />
        <StatCard icon={Shield} label="Validated" value={stats.validated} sub={`${stats.pending} pending`} />
        <StatCard icon={Zap} label="Heats" value={`${stats.activeHeats}`} sub={`${stats.upcomingHeats} upcoming`} accent />
      </div>

      {/* Active heats indicator */}
      {stats.activeHeats > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <div className="relative">
            <Zap className="h-6 w-6 text-primary" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{stats.activeHeats} heat{stats.activeHeats > 1 ? "s" : ""} in progress</p>
            <p className="text-xs text-muted-foreground">{stats.completedHeats} completed · {stats.upcomingHeats} upcoming</p>
          </div>
        </div>
      )}

      {/* Heat timeline */}
      {heats.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground uppercase">Heat Schedule</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {heats.slice(0, 20).map((heat) => (
              <div key={heat.id}
                className={`shrink-0 px-3 py-2 rounded-lg border text-center min-w-[80px] ${
                  heat.status === "active" ? "bg-primary/10 border-primary text-primary" :
                  heat.status === "completed" ? "bg-accent/10 border-accent/30 text-accent-foreground" :
                  "bg-muted/30 border-border text-muted-foreground"
                }`}>
                <p className="text-xs font-bold">Heat {heat.heat_number}</p>
                <Badge variant="outline" className={`text-[9px] mt-1 ${
                  heat.status === "active" ? "border-primary text-primary" :
                  heat.status === "completed" ? "border-accent text-accent-foreground" :
                  ""
                }`}>
                  {heat.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Validation queue */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground uppercase">Validation Queue</h3>
          </div>
          <ValidationQueue competitionId={competitionId} />
        </div>

        {/* Live leaderboard preview */}
        <LeaderboardPanel competitionId={competitionId} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`border rounded-xl p-4 ${accent ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-primary"}`} />
        <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
      </div>
      <p className="text-2xl font-black text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
