import { supabase } from "@/integrations/supabase/client";

export interface ScoreRow {
  id: string;
  competition_id: string;
  team_id: string;
  workout_id: string;
  score: number;
  judge_id: string | null;
  locked: boolean;
  locked_at: string | null;
  reps_completed: number | null;
  time_seconds: number | null;
  load_value: number | null;
  points_awarded: number | null;
  validation_status: string | null;
  normalized_score: number | null;
  rank: number | null;
  created_at: string;
  updated_at: string;
}

export async function fetchScores(competitionId: string): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from("competition_scores")
    .select("*")
    .eq("competition_id", competitionId);
  if (error) throw error;
  return (data ?? []) as ScoreRow[];
}

/** Multi-field score upsert — populates the correct raw column based on scoring_type */
export interface ScoreUpsert {
  competition_id: string;
  team_id: string;
  workout_id: string;
  score: number;
  judge_id?: string | null;
  reps_completed?: number | null;
  time_seconds?: number | null;
  load_value?: number | null;
  points_awarded?: number | null;
}

export async function upsertScores(scores: ScoreUpsert[]): Promise<void> {
  if (scores.length === 0) return;
  const { error } = await supabase
    .from("competition_scores")
    .upsert(
      scores.map((s) => ({
        competition_id: s.competition_id,
        team_id: s.team_id,
        workout_id: s.workout_id,
        score: s.score,
        judge_id: s.judge_id ?? null,
        reps_completed: s.reps_completed ?? null,
        time_seconds: s.time_seconds ?? null,
        load_value: s.load_value ?? null,
        points_awarded: s.points_awarded ?? null,
      })),
      { onConflict: "team_id,workout_id" }
    );
  if (error) throw error;
}

export async function lockWorkout(workoutId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_workouts")
    .update({ is_locked: true })
    .eq("id", workoutId);
  if (error) throw error;
}

export async function unlockWorkout(workoutId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_workouts")
    .update({ is_locked: false })
    .eq("id", workoutId);
  if (error) throw error;
}

export async function lockScore(scoreId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_scores")
    .update({ locked: true, locked_at: new Date().toISOString() })
    .eq("id", scoreId);
  if (error) throw error;
}

export async function unlockScore(scoreId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_scores")
    .update({ locked: false, locked_at: null })
    .eq("id", scoreId);
  if (error) throw error;
}

export async function fetchScoringEvents(competitionId: string) {
  const { data, error } = await supabase
    .from("scoring_events")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

/** Fetch cached leaderboard from competition_leaderboards table */
export async function fetchCachedLeaderboard(competitionId: string) {
  const { data, error } = await supabase
    .from("competition_leaderboards")
    .select("*, competition_teams(team_name, division_id, division), competition_divisions:competition_teams!inner(division_id)")
    .eq("competition_id", competitionId)
    .order("overall_rank", { ascending: true });
  if (error) throw error;
  return data;
}

/** Fetch workout rankings for a competition */
export async function fetchWorkoutRankings(competitionId: string) {
  const { data, error } = await supabase
    .from("workout_rankings")
    .select("*, competition_teams(team_name)")
    .eq("competition_id", competitionId)
    .order("rank", { ascending: true });
  if (error) throw error;
  return data;
}
