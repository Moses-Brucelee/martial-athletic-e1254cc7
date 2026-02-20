import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCompetitionRole } from "@/hooks/useCompetitionRole";
import { useSuperUserAccess } from "@/hooks/useSuperUserAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { fetchDivisions } from "@/data/divisions";
import { fetchJudges } from "@/data/judges";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { TeamsPanel } from "@/components/competition/TeamsPanel";
import { WorkoutsPanel } from "@/components/competition/WorkoutsPanel";
import { ScoresPanel } from "@/components/competition/ScoresPanel";
import { LeaderboardPanel } from "@/components/competition/LeaderboardPanel";
import { DivisionsPanel } from "@/components/competition/DivisionsPanel";
import { JudgesPanel } from "@/components/competition/JudgesPanel";
import { ParticipantsPanel } from "@/components/competition/ParticipantsPanel";
import { ScoreLockControls } from "@/components/competition/ScoreLockControls";
import type { Division, Team as DomainTeam, Workout as DomainWorkout } from "@/domain/competition";
import type { Judge } from "@/domain/judges";

interface Team {
  id?: string;
  team_name: string;
  division: string;
  division_id?: string | null;
}

interface Workout {
  id: string;
  workout_number: number;
  measurement_type: string;
  name: string | null;
  is_locked?: boolean;
}

export default function CompetitionDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { isOwner, isJudge, role, loading: roleLoading } = useCompetitionRole(id);
  const { isSuperUser } = useSuperUserAccess();
  const { canAccess } = useSubscription();

  const [competition, setCompetition] = useState<{ name: string; created_by: string } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hasPaidTier = canAccess('create_competitions');
  const canAdmin = (isOwner && hasPaidTier) || isSuperUser;
  const canScore = ((isOwner || isJudge) && hasPaidTier) || isSuperUser;

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [compRes, teamsRes, workoutsRes] = await Promise.all([
        supabase.from("competitions").select("name, created_by").eq("id", id).single(),
        supabase.from("competition_teams").select("*").eq("competition_id", id).order("created_at"),
        supabase.from("competition_workouts").select("*").eq("competition_id", id).order("workout_number"),
      ]);

      if (compRes.error) setError(compRes.error.message);
      else setCompetition(compRes.data);

      if (teamsRes.data) setTeams(teamsRes.data.map((t: any) => ({ id: t.id, team_name: t.team_name, division: t.division || "", division_id: t.division_id })));
      if (workoutsRes.data) setWorkouts(workoutsRes.data.map((w: any) => ({ ...w, is_locked: w.is_locked || false })));

      // Load divisions and judges
      try {
        const [divs, jdgs] = await Promise.all([
          fetchDivisions(id),
          fetchJudges(id),
        ]);
        setDivisions(divs);
        setJudges(jdgs);
      } catch {}

      setLoading(false);
    };
    load();
  }, [id]);

  if (profileLoading || loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-14 w-full" />
        <div className="max-w-5xl mx-auto p-6 grid sm:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Determine tabs based on role
  const renderOwnerTabs = () => (
    <Tabs defaultValue="setup" className="w-full">
      <TabsList className="w-full grid grid-cols-6 mb-6">
        <TabsTrigger value="setup">Setup</TabsTrigger>
        <TabsTrigger value="judges">Judges</TabsTrigger>
        <TabsTrigger value="scores">Scores</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        <TabsTrigger value="roster">Roster</TabsTrigger>
        <TabsTrigger value="overview">Overview</TabsTrigger>
      </TabsList>

      <TabsContent value="setup">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DivisionsPanel competitionId={id!} divisions={divisions} setDivisions={setDivisions} canAdmin={canAdmin} />
          <TeamsPanel competitionId={id!} teams={teams} setTeams={setTeams} isOwner={canAdmin} divisions={divisions} />
          <WorkoutsPanel competitionId={id!} workouts={workouts} setWorkouts={setWorkouts} isOwner={canAdmin} />
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground uppercase mb-4">Score Locks</h3>
            <ScoreLockControls workouts={workouts as DomainWorkout[]} setWorkouts={setWorkouts as any} canAdmin={canAdmin} isSuperUser={isSuperUser} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="judges">
        <JudgesPanel competitionId={id!} judges={judges} setJudges={setJudges} canAdmin={canAdmin} />
      </TabsContent>

      <TabsContent value="scores">
        <ScoresPanel competitionId={id!} teams={teams} workouts={workouts} canScore={canScore} judgeId={user?.id} />
      </TabsContent>

      <TabsContent value="leaderboard">
        <LeaderboardPanel competitionId={id!} />
      </TabsContent>

      <TabsContent value="roster">
        <ParticipantsPanel competitionId={id!} teams={teams as DomainTeam[]} canAdmin={canAdmin} />
      </TabsContent>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamsPanel competitionId={id!} teams={teams} setTeams={setTeams} isOwner={false} divisions={divisions} />
          <WorkoutsPanel competitionId={id!} workouts={workouts} setWorkouts={setWorkouts} isOwner={false} />
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderJudgeTabs = () => (
    <Tabs defaultValue="scores" className="w-full">
      <TabsList className="w-full grid grid-cols-3 mb-6">
        <TabsTrigger value="scores">Scores</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        <TabsTrigger value="roster">Roster</TabsTrigger>
      </TabsList>

      <TabsContent value="scores">
        <ScoresPanel competitionId={id!} teams={teams} workouts={workouts} canScore={true} judgeId={user?.id} />
      </TabsContent>

      <TabsContent value="leaderboard">
        <LeaderboardPanel competitionId={id!} />
      </TabsContent>

      <TabsContent value="roster">
        <ParticipantsPanel competitionId={id!} teams={teams as DomainTeam[]} canAdmin={false} />
      </TabsContent>
    </Tabs>
  );

  const renderViewerTabs = () => (
    <Tabs defaultValue="leaderboard" className="w-full">
      <TabsList className="w-full grid grid-cols-3 mb-6">
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        <TabsTrigger value="roster">Roster</TabsTrigger>
        <TabsTrigger value="overview">Overview</TabsTrigger>
      </TabsList>

      <TabsContent value="leaderboard">
        <LeaderboardPanel competitionId={id!} />
      </TabsContent>

      <TabsContent value="roster">
        <ParticipantsPanel competitionId={id!} teams={teams as DomainTeam[]} canAdmin={false} />
      </TabsContent>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamsPanel competitionId={id!} teams={teams} setTeams={setTeams} isOwner={false} divisions={divisions} />
          <WorkoutsPanel competitionId={id!} workouts={workouts} setWorkouts={setWorkouts} isOwner={false} />
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CompetitionHeader
        title="Tournament"
        subscriptionTier={profile?.subscription_tier}
        avatarUrl={profile?.avatar_url}
        displayName={profile?.display_name}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight uppercase mb-1">
          Competition Dashboard
        </h2>
        {competition && (
          <p className="text-muted-foreground mb-6">{competition.name}</p>
        )}

        {error && (
          <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {canAdmin ? renderOwnerTabs() : isJudge ? renderJudgeTabs() : renderViewerTabs()}
      </main>
    </div>
  );
}
