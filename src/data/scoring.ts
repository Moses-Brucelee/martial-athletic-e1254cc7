import { supabase } from "@/integrations/supabase/client";

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
  tie_breaker_seconds?: number | null;
  work_completed?: number | null;
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
        tie_breaker_seconds: s.tie_breaker_seconds ?? null,
        work_completed: s.work_completed ?? null,
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
