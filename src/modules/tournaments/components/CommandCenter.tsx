import { useMemo } from "react";
import { Activity, Users, Flame, BarChart3, Shield } from "lucide-react";
import { useTeams, useWorkouts } from "@/modules/tournaments/hooks";
import { useScores } from "@/modules/scoring/hooks";
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
  const { data: leaderboardEntries = [] } = useLeaderboard(competitionId);

  const stats = useMemo(() => {
    const totalPossible = teams.length * workouts.length;
    const submitted = scoreRows.length;
    const validated = scoreRows.filter((s) => s.validation_status === "validated").length;
    const pending = scoreRows.filter((s) => !s.validation_status || s.validation_status === "pending").length;
    const lockedWorkouts = workouts.filter((w) => w.is_locked).length;

    return { totalPossible, submitted, validated, pending, lockedWorkouts, totalWorkouts: workouts.length };
  }, [teams, workouts, scoreRows]);

  const completionPct = stats.totalPossible > 0
    ? Math.round((stats.submitted / stats.totalPossible) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Teams" value={teams.length} />
        <StatCard icon={Flame} label="Workouts" value={`${stats.lockedWorkouts}/${stats.totalWorkouts}`} sub="locked" />
        <StatCard icon={BarChart3} label="Scores" value={`${completionPct}%`} sub={`${stats.submitted}/${stats.totalPossible}`} />
        <StatCard icon={Shield} label="Validated" value={stats.validated} sub={`${stats.pending} pending`} />
      </div>

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

function StatCard({ icon: Icon, label, value, sub }: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
      </div>
      <p className="text-2xl font-black text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
