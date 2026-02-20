import { supabase } from "@/integrations/supabase/client";

export interface ScoreUpsert {
  competition_id: string;
  team_id: string;
  workout_id: string;
  score: number;
  judge_id?: string | null;
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
