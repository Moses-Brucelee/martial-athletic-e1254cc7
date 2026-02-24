import { supabase } from "@/integrations/supabase/client";
import type { Competition, Division, Team, Workout, Bracket, Bout } from "./types";
import type { CreateCompetitionInput, AddTeamInput, AddWorkoutInput, CreateBracketInput } from "./types";

// ── Competitions ──────────────────────────────────────────────────────

export async function fetchCompetition(id: string): Promise<Competition> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Competition;
}

export async function fetchCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Competition[];
}

export async function createCompetition(input: CreateCompetitionInput): Promise<Competition> {
  const { data, error } = await supabase
    .from("competitions")
    .insert({
      created_by: input.created_by,
      name: input.name.trim(),
      date: input.date || null,
      venue: input.venue || null,
      type: input.type || null,
      host_gym: input.host_gym || null,
      divisions: input.divisions || null,
      age_category_type: input.age_category_type || "open",
      min_age: input.min_age ?? null,
      max_age: input.max_age ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Competition;
}

export async function fetchUserCompetitionCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("competitions")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId);
  if (error) throw error;
  return count ?? 0;
}

// ── Teams ─────────────────────────────────────────────────────────────

export async function fetchTeams(competitionId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from("competition_teams")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Team[];
}

export async function addTeam(input: AddTeamInput): Promise<Team> {
  const { data, error } = await supabase
    .from("competition_teams")
    .insert({
      competition_id: input.competition_id,
      team_name: input.team_name,
      division: input.division || null,
      division_id: input.division_id || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Team;
}

export async function removeTeam(teamId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_teams")
    .delete()
    .eq("id", teamId);
  if (error) throw error;
}

// ── Workouts ──────────────────────────────────────────────────────────

export async function fetchWorkouts(competitionId: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("competition_workouts")
    .select("*")
    .eq("competition_id", competitionId)
    .order("workout_number");
  if (error) throw error;
  return (data ?? []) as Workout[];
}

export async function addWorkout(input: AddWorkoutInput): Promise<Workout> {
  const { data, error } = await supabase
    .from("competition_workouts")
    .insert({
      competition_id: input.competition_id,
      workout_number: input.workout_number,
      measurement_type: input.measurement_type,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Workout;
}

export async function removeWorkout(workoutId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_workouts")
    .delete()
    .eq("id", workoutId);
  if (error) throw error;
}

export async function updateWorkoutMeasurement(workoutId: string, measurement: string): Promise<void> {
  const { error } = await supabase
    .from("competition_workouts")
    .update({ measurement_type: measurement })
    .eq("id", workoutId);
  if (error) throw error;
}

export async function saveWorkouts(competitionId: string, workouts: { workout_number: number; measurement_type: string }[]): Promise<void> {
  await supabase.from("competition_workouts").delete().eq("competition_id", competitionId);
  const rows = workouts.map((w, i) => ({
    competition_id: competitionId,
    workout_number: i + 1,
    measurement_type: w.measurement_type,
  }));
  const { error } = await supabase.from("competition_workouts").insert(rows);
  if (error) throw error;
}

// ── Divisions (re-export from data layer for backward compat) ─────────

export { fetchDivisions, addDivision, removeDivision, updateDivision } from "@/data/divisions";

// ── Brackets ──────────────────────────────────────────────────────────

export async function fetchBrackets(competitionId: string): Promise<Bracket[]> {
  const { data, error } = await supabase
    .from("brackets")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Bracket[];
}

export async function createBracket(input: CreateBracketInput): Promise<Bracket> {
  const { data, error } = await supabase
    .from("brackets")
    .insert({
      competition_id: input.competition_id,
      division_id: input.division_id || null,
      name: input.name,
      bracket_type: input.bracket_type || "single_elimination",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Bracket;
}

// ── Bouts ─────────────────────────────────────────────────────────────

export async function fetchBouts(bracketId: string): Promise<Bout[]> {
  const { data, error } = await supabase
    .from("bouts")
    .select("*")
    .eq("bracket_id", bracketId)
    .order("round_number")
    .order("bout_number");
  if (error) throw error;
  return (data ?? []) as Bout[];
}

export async function updateBoutWinner(boutId: string, winnerId: string): Promise<void> {
  const { error } = await supabase
    .from("bouts")
    .update({ winner_id: winnerId, status: "completed" })
    .eq("id", boutId);
  if (error) throw error;
}

// ── Batch bracket + bout creation ─────────────────────────────────────

export async function createBracketWithBouts(
  competitionId: string,
  brackets: { name: string; division_id: string | null; bracket_type: string; bouts: { round_number: number; bout_number: number; team_a_id: string | null; team_b_id: string | null; status: string }[] }[],
): Promise<void> {
  for (const b of brackets) {
    const { data: bracket, error: bErr } = await supabase
      .from("brackets")
      .insert({ competition_id: competitionId, name: b.name, division_id: b.division_id, bracket_type: b.bracket_type })
      .select("id")
      .single();
    if (bErr) throw bErr;

    if (b.bouts.length > 0) {
      const rows = b.bouts.map((bout) => ({ ...bout, bracket_id: bracket.id }));
      const { error: boutErr } = await supabase.from("bouts").insert(rows);
      if (boutErr) throw boutErr;
    }
  }
}

export async function deleteBrackets(competitionId: string): Promise<void> {
  // Bouts cascade via bracket_id FK — but we delete explicitly for safety
  const { data: brackets } = await supabase
    .from("brackets")
    .select("id")
    .eq("competition_id", competitionId);

  if (brackets && brackets.length > 0) {
    const ids = brackets.map((b) => b.id);
    await supabase.from("bouts").delete().in("bracket_id", ids);
    await supabase.from("brackets").delete().eq("competition_id", competitionId);
  }
}

// ── Competition status ────────────────────────────────────────────────

export async function updateCompetitionStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("competitions")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
