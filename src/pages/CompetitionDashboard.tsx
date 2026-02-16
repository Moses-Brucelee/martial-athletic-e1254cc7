import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, AlertCircle, Trash2, Users, Dumbbell } from "lucide-react";

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

const MEASUREMENT_OPTIONS = ["time", "reps", "weight", "points", "distance"];

export default function CompetitionDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  const [competition, setCompetition] = useState<{ name: string } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New team form
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDivision, setNewTeamDivision] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);

  // New workout form
  const [addingWorkout, setAddingWorkout] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [compRes, teamsRes, workoutsRes] = await Promise.all([
        supabase.from("competitions").select("name").eq("id", id).single(),
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

  const addTeam = async () => {
    if (!id || !newTeamName.trim()) return;
    setAddingTeam(true);
    const { data, error: insertError } = await supabase
      .from("competition_teams")
      .insert({ competition_id: id, team_name: newTeamName.trim(), division: newTeamDivision || null })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setTeams([...teams, { id: data.id, team_name: data.team_name, division: data.division || "" }]);
      setNewTeamName("");
      setNewTeamDivision("");
    }
    setAddingTeam(false);
  };

  const removeTeam = async (teamId: string) => {
    await supabase.from("competition_teams").delete().eq("id", teamId);
    setTeams(teams.filter((t) => t.id !== teamId));
  };

  const addWorkout = async () => {
    if (!id) return;
    setAddingWorkout(true);
    const nextNum = workouts.length > 0 ? Math.max(...workouts.map((w) => w.workout_number)) + 1 : 1;
    const { data, error: insertError } = await supabase
      .from("competition_workouts")
      .insert({ competition_id: id, workout_number: nextNum, measurement_type: "reps" })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setWorkouts([...workouts, data as Workout]);
    }
    setAddingWorkout(false);
  };

  const removeWorkout = async (workoutId: string) => {
    await supabase.from("competition_workouts").delete().eq("id", workoutId);
    setWorkouts(workouts.filter((w) => w.id !== workoutId));
  };

  const updateWorkoutMeasurement = async (workoutId: string, measurement: string) => {
    await supabase.from("competition_workouts").update({ measurement_type: measurement }).eq("id", workoutId);
    setWorkouts(workouts.map((w) => (w.id === workoutId ? { ...w, measurement_type: measurement } : w)));
  };

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-14 w-full" />
        <div className="max-w-4xl mx-auto p-6 grid sm:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CompetitionHeader
        title="Tournament"
        subscriptionTier={profile?.subscription_tier}
        avatarUrl={profile?.avatar_url}
        displayName={profile?.display_name}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teams */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground uppercase">Teams</h3>
            </div>

            {teams.length === 0 && (
              <p className="text-sm text-muted-foreground mb-4">No teams yet. Add your first team below.</p>
            )}

            <div className="space-y-2 mb-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                >
                  <div>
                    <span className="font-semibold text-foreground text-sm">{team.team_name}</span>
                    {team.division && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">
                        {team.division}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => team.id && removeTeam(team.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add team */}
            <div className="flex gap-2">
              <Input
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="h-9 bg-background text-sm flex-1"
              />
              <Input
                placeholder="Division"
                value={newTeamDivision}
                onChange={(e) => setNewTeamDivision(e.target.value)}
                className="h-9 bg-background text-sm w-24"
              />
              <Button
                size="sm"
                onClick={addTeam}
                disabled={addingTeam || !newTeamName.trim()}
                className="bg-accent hover:bg-accent/90 text-accent-foreground h-9"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Workouts */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground uppercase">Workouts</h3>
            </div>

            {workouts.length === 0 && (
              <p className="text-sm text-muted-foreground mb-4">No workouts yet.</p>
            )}

            <div className="space-y-2 mb-4">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border"
                >
                  <span className="text-sm font-bold text-primary whitespace-nowrap">
                    #{workout.workout_number}
                  </span>
                  <Select
                    value={workout.measurement_type}
                    onValueChange={(val) => updateWorkoutMeasurement(workout.id, val)}
                  >
                    <SelectTrigger className="h-9 bg-background flex-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEASUREMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="capitalize">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeWorkout(workout.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={addWorkout}
              disabled={addingWorkout}
              className="w-full border-dashed border-accent text-accent hover:bg-accent/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Workout
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
