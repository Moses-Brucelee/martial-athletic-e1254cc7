import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useCompetition, useWorkouts, useDivisions } from "@/modules/tournaments/hooks";
import { useAthleteCompetitionScores } from "@/modules/athletes/hooks";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, Calendar, MapPin, ChevronLeft, Dumbbell,
  Timer, Hash, Weight, Award
} from "lucide-react";

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: competition, isLoading: compLoading } = useCompetition(id);
  const { data: workouts = [] } = useWorkouts(id);
  const { data: divisions = [] } = useDivisions(id);
  const { data: scoreData, isLoading: scoresLoading } = useAthleteCompetitionScores(user?.id, id);

  if (compLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader title="Competition" />
        <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-foreground font-bold">Competition not found</p>
        <Button variant="outline" onClick={() => navigate("/performances")} className="mt-4">Back</Button>
      </div>
    );
  }

  const displayDate = competition.start_date || competition.date;
  const scores = scoreData?.scores ?? [];
  const registration = scoreData?.registration;
  const divisionName = registration?.division_id
    ? divisions.find((d) => d.id === registration.division_id)?.name
    : null;

  // Calculate total points and rank
  const totalPoints = scores.reduce((sum, s) => sum + (s.points_awarded ?? 0), 0);

  // Sort workouts by workout_number
  const sortedWorkouts = [...workouts].sort((a, b) => a.workout_number - b.workout_number);

  const getScoreIcon = (scoringType: string) => {
    switch (scoringType) {
      case "time": return <Timer className="h-4 w-4 text-primary" />;
      case "reps": return <Hash className="h-4 w-4 text-primary" />;
      case "load": return <Weight className="h-4 w-4 text-primary" />;
      default: return <Award className="h-4 w-4 text-primary" />;
    }
  };

  const formatScore = (score: any, workout: any) => {
    if (!score) return "—";
    switch (workout.scoring_type) {
      case "time": {
        const secs = score.time_seconds ?? score.score;
        if (!secs) return "—";
        const min = Math.floor(secs / 60);
        const sec = Math.round(secs % 60);
        return `${min}:${sec.toString().padStart(2, "0")}`;
      }
      case "reps":
        return `${score.reps_completed ?? score.score} reps`;
      case "load":
        return `${score.load_value ?? score.score} kg`;
      default:
        return `${score.points_awarded ?? score.score} pts`;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Competition Detail" />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/performances")} className="text-muted-foreground -ml-2">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Performances
        </Button>

        {/* Competition header card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {competition.poster_url && (
            <AdaptivePoster src={competition.poster_url} alt={competition.name} className="h-40" />
          )}
          <div className="p-5">
            <h1 className="text-xl font-black text-foreground tracking-tight">{competition.name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {displayDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(displayDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </span>
              )}
              {competition.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />{competition.venue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Athlete summary */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Division</p>
              <p className="text-sm font-bold text-foreground mt-1">{divisionName ?? "Open"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Points</p>
              <p className="text-2xl font-black text-primary mt-1">{totalPoints}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Workouts</p>
              <p className="text-sm font-bold text-foreground mt-1">{scores.length} / {workouts.length}</p>
            </div>
          </div>
        </div>

        {/* Workout results */}
        <div>
          <h2 className="text-lg font-bold text-foreground uppercase flex items-center gap-2 mb-4">
            <Dumbbell className="h-5 w-5 text-primary" />
            Workout Results
          </h2>

          {scoresLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : sortedWorkouts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No workouts configured for this competition.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedWorkouts.map((w) => {
                const score = scores.find((s) => s.workout_id === w.id);
                return (
                  <div key={w.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          {getScoreIcon(w.scoring_type)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {w.name || `Workout ${w.workout_number}`}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{w.scoring_type} • {w.workout_type}</p>
                        </div>
                      </div>
                    </div>

                    {score ? (
                      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase">Score</p>
                          <p className="text-sm font-bold text-foreground">{formatScore(score, w)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase">Rank</p>
                          <p className="text-sm font-bold text-foreground">
                            {score.rank != null ? `#${score.rank}` : "—"}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase">Points</p>
                          <p className="text-sm font-bold text-primary">
                            {score.points_awarded ?? "—"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground text-center">No score recorded</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View leaderboard link */}
        <Button variant="outline" className="w-full" onClick={() => navigate(`/event/${id}`)}>
          <Trophy className="h-4 w-4 mr-2" /> View Full Leaderboard
        </Button>
      </main>
    </div>
  );
}
