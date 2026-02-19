import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { TeamsPanel } from "@/components/competition/TeamsPanel";
import { WorkoutsPanel } from "@/components/competition/WorkoutsPanel";
import { ScoresPanel } from "@/components/competition/ScoresPanel";
import { LeaderboardPanel } from "@/components/competition/LeaderboardPanel";

interface Team {
  id?: string;
  team_name: string;
  division: string;
}

interface Workout {
  id: string;
  workout_number: number;
  measurement_type: string;
  name: string | null;
}

export default function CompetitionDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  const [competition, setCompetition] = useState<{ name: string; created_by: string } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isOwner = !!(user && competition && competition.created_by === user.id);

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

      if (teamsRes.data) setTeams(teamsRes.data.map((t) => ({ id: t.id, team_name: t.team_name, division: t.division || "" })));
      if (workoutsRes.data) setWorkouts(workoutsRes.data as Workout[]);
      setLoading(false);
    };
    load();
  }, [id]);

  if (profileLoading || loading) {
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

  // Free users (non-owners) see only leaderboard
  const showManagement = isOwner;

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

        {showManagement ? (
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-6">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            <TabsContent value="setup">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TeamsPanel competitionId={id!} teams={teams} setTeams={setTeams} isOwner={isOwner} />
                <WorkoutsPanel competitionId={id!} workouts={workouts} setWorkouts={setWorkouts} isOwner={isOwner} />
              </div>
            </TabsContent>

            <TabsContent value="scores">
              <ScoresPanel competitionId={id!} teams={teams} workouts={workouts} isOwner={isOwner} />
            </TabsContent>

            <TabsContent value="leaderboard">
              <LeaderboardPanel competitionId={id!} teams={teams} workouts={workouts} />
            </TabsContent>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TeamsPanel competitionId={id!} teams={teams} setTeams={setTeams} isOwner={false} />
                <WorkoutsPanel competitionId={id!} workouts={workouts} setWorkouts={setWorkouts} isOwner={false} />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Non-owner / free user: read-only leaderboard + overview */
          <div className="space-y-6">
            <LeaderboardPanel competitionId={id!} teams={teams} workouts={workouts} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TeamsPanel competitionId={id!} teams={teams} setTeams={setTeams} isOwner={false} />
              <WorkoutsPanel competitionId={id!} workouts={workouts} setWorkouts={setWorkouts} isOwner={false} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
