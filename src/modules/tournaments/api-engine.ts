import { supabase } from "@/integrations/supabase/client";
import type {
  CompetitionRound,
  Heat,
  HeatAssignment,
  JudgeAssignment,
  CompetitionSettings,
  CompetitionTemplate,
  CompetitionType,
  AddRoundInput,
  AddHeatInput,
  AssignJudgeInput,
} from "./types";

// ── Competition Types ─────────────────────────────────────────────────

export async function fetchCompetitionTypes(): Promise<CompetitionType[]> {
  const { data, error } = await supabase
    .from("competition_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as CompetitionType[];
}

// ── Competition Settings ──────────────────────────────────────────────

export async function fetchCompetitionSettings(competitionId: string): Promise<CompetitionSettings | null> {
  const { data, error } = await supabase
    .from("competition_settings")
    .select("*")
    .eq("competition_id", competitionId)
    .maybeSingle();
  if (error) throw error;
  return data as CompetitionSettings | null;
}

export async function upsertCompetitionSettings(
  competitionId: string,
  settings: Partial<Omit<CompetitionSettings, "id" | "competition_id" | "created_at" | "updated_at">>
): Promise<CompetitionSettings> {
  const row = { competition_id: competitionId, ...settings } as Record<string, unknown>;
  const { data, error } = await supabase
    .from("competition_settings")
    .upsert(row as any, { onConflict: "competition_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as CompetitionSettings;
}

// ── Competition Rounds ────────────────────────────────────────────────

export async function fetchRounds(competitionId: string): Promise<CompetitionRound[]> {
  const { data, error } = await supabase
    .from("competition_rounds")
    .select("*")
    .eq("competition_id", competitionId)
    .order("round_number");
  if (error) throw error;
  return (data ?? []) as CompetitionRound[];
}

export async function addRound(input: AddRoundInput): Promise<CompetitionRound> {
  const { data, error } = await supabase
    .from("competition_rounds")
    .insert({
      competition_id: input.competition_id,
      name: input.name,
      round_number: input.round_number,
      scheduled_start: input.scheduled_start ?? null,
      scheduled_end: input.scheduled_end ?? null,
      scoring_weight: input.scoring_weight ?? 1.0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CompetitionRound;
}

export async function updateRound(roundId: string, updates: Partial<Pick<CompetitionRound, "name" | "status" | "scheduled_start" | "scheduled_end" | "scoring_weight">>): Promise<void> {
  const { error } = await supabase
    .from("competition_rounds")
    .update(updates)
    .eq("id", roundId);
  if (error) throw error;
}

export async function removeRound(roundId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_rounds")
    .delete()
    .eq("id", roundId);
  if (error) throw error;
}

// ── Heat Schedule ─────────────────────────────────────────────────────

export async function fetchHeats(competitionId: string): Promise<Heat[]> {
  const { data, error } = await supabase
    .from("heat_schedule")
    .select("*")
    .eq("competition_id", competitionId)
    .order("heat_number");
  if (error) throw error;
  return (data ?? []) as Heat[];
}

export async function addHeat(input: AddHeatInput): Promise<Heat> {
  const { data, error } = await supabase
    .from("heat_schedule")
    .insert({
      competition_id: input.competition_id,
      workout_id: input.workout_id ?? null,
      round_id: input.round_id ?? null,
      heat_number: input.heat_number,
      lane_count: input.lane_count ?? 10,
      scheduled_start: input.scheduled_start ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Heat;
}

export async function updateHeatStatus(heatId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("heat_schedule")
    .update({ status })
    .eq("id", heatId);
  if (error) throw error;
}

export async function removeHeat(heatId: string): Promise<void> {
  const { error } = await supabase
    .from("heat_schedule")
    .delete()
    .eq("id", heatId);
  if (error) throw error;
}

// ── Heat Assignments ──────────────────────────────────────────────────

export async function fetchHeatAssignments(heatId: string): Promise<HeatAssignment[]> {
  const { data, error } = await supabase
    .from("heat_assignments")
    .select("*")
    .eq("heat_id", heatId)
    .order("lane_number");
  if (error) throw error;
  return (data ?? []) as HeatAssignment[];
}

export async function assignTeamToHeat(heatId: string, teamId: string, laneNumber?: number): Promise<HeatAssignment> {
  const { data, error } = await supabase
    .from("heat_assignments")
    .insert({ heat_id: heatId, team_id: teamId, lane_number: laneNumber ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data as HeatAssignment;
}

export async function removeHeatAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from("heat_assignments")
    .delete()
    .eq("id", assignmentId);
  if (error) throw error;
}

export async function fetchAllHeatAssignments(competitionId: string): Promise<(HeatAssignment & { heat_number?: number })[]> {
  const { data, error } = await supabase
    .from("heat_assignments")
    .select("*, heat_schedule!heat_assignments_heat_id_fkey(heat_number, competition_id)")
    .order("lane_number");
  if (error) throw error;
  // Filter by competition and flatten
  return ((data ?? []) as any[])
    .filter((a: any) => a.heat_schedule?.competition_id === competitionId)
    .map((a: any) => ({
      id: a.id,
      heat_id: a.heat_id,
      team_id: a.team_id,
      lane_number: a.lane_number,
      created_at: a.created_at,
      heat_number: a.heat_schedule?.heat_number,
    }));
}

// ── Judge Assignments ─────────────────────────────────────────────────

export async function fetchJudgeAssignments(competitionId: string): Promise<JudgeAssignment[]> {
  const { data, error } = await supabase
    .from("judge_assignments")
    .select("*")
    .eq("competition_id", competitionId);
  if (error) throw error;
  return (data ?? []) as JudgeAssignment[];
}

export async function assignJudge(input: AssignJudgeInput): Promise<JudgeAssignment> {
  const { data, error } = await supabase
    .from("judge_assignments")
    .insert({
      competition_id: input.competition_id,
      judge_id: input.judge_id,
      heat_id: input.heat_id ?? null,
      workout_id: input.workout_id ?? null,
      lane_number: input.lane_number ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as JudgeAssignment;
}

export async function removeJudgeAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from("judge_assignments")
    .delete()
    .eq("id", assignmentId);
  if (error) throw error;
}

// ── Competition Templates ─────────────────────────────────────────────

export async function fetchTemplates(): Promise<CompetitionTemplate[]> {
  const { data, error } = await supabase
    .from("competition_templates")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as CompetitionTemplate[];
}

export async function saveTemplate(input: {
  name: string;
  description?: string | null;
  competition_type?: string;
  template_data: unknown;
  is_public?: boolean;
  created_by: string;
}): Promise<CompetitionTemplate> {
  const { data, error } = await supabase
    .from("competition_templates")
    .insert({
      name: input.name,
      description: input.description || null,
      competition_type: input.competition_type || "crossfit",
      template_data: input.template_data as any,
      is_public: input.is_public ?? false,
      created_by: input.created_by,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CompetitionTemplate;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_templates")
    .delete()
    .eq("id", templateId);
  if (error) throw error;
}

// ── Workout Rankings (read-only cache) ────────────────────────────────

export interface WorkoutRankingRow {
  id: string;
  competition_id: string;
  workout_id: string;
  team_id: string;
  division_id: string | null;
  normalized_score: number;
  rank: number;
  points_earned: number;
  recomputed_at: string;
}

export async function fetchWorkoutRankings(competitionId: string): Promise<WorkoutRankingRow[]> {
  const { data, error } = await supabase
    .from("workout_rankings")
    .select("*")
    .eq("competition_id", competitionId)
    .order("rank");
  if (error) throw error;
  return (data ?? []) as WorkoutRankingRow[];
}

// ── Cached Leaderboard (read-only) ────────────────────────────────────

export interface CachedLeaderboardRow {
  id: string;
  competition_id: string;
  division_id: string | null;
  team_id: string;
  total_rank_sum: number;
  overall_rank: number;
  tie_broken_by: string | null;
  recomputed_at: string;
}

export async function fetchCachedLeaderboard(competitionId: string): Promise<CachedLeaderboardRow[]> {
  const { data, error } = await supabase
    .from("competition_leaderboards")
    .select("*")
    .eq("competition_id", competitionId)
    .order("overall_rank");
  if (error) throw error;
  return (data ?? []) as CachedLeaderboardRow[];
}

// ── Audit Events ──────────────────────────────────────────────────────

export async function fetchAuditEvents(competitionId: string, limit = 100) {
  const { data, error } = await supabase
    .from("competition_audit_events")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
