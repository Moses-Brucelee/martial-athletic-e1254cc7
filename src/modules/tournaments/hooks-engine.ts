import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as engineApi from "./api-engine";
import type { AddRoundInput, AddHeatInput, AssignJudgeInput } from "./types";
import { supabase } from "@/integrations/supabase/client";

// ── Competition Types ─────────────────────────────────────────────────

export function useCompetitionTypes() {
  return useQuery({
    queryKey: ["competition-types"],
    queryFn: engineApi.fetchCompetitionTypes,
    staleTime: 60 * 60 * 1000, // 1 hour — rarely changes
  });
}

// ── Competition Settings ──────────────────────────────────────────────

export function useCompetitionSettings(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["competition-settings", competitionId],
    queryFn: () => engineApi.fetchCompetitionSettings(competitionId!),
    enabled: !!competitionId,
  });
}

export function useUpsertCompetitionSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, settings }: { competitionId: string; settings: Parameters<typeof engineApi.upsertCompetitionSettings>[1] }) =>
      engineApi.upsertCompetitionSettings(competitionId, settings),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["competition-settings", variables.competitionId] });
    },
  });
}

// ── Rounds ────────────────────────────────────────────────────────────

export function useRounds(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["rounds", competitionId],
    queryFn: () => engineApi.fetchRounds(competitionId!),
    enabled: !!competitionId,
  });
}

export function useAddRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddRoundInput) => engineApi.addRound(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["rounds", variables.competition_id] });
    },
  });
}

export function useUpdateRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, competitionId, updates }: { roundId: string; competitionId: string; updates: Parameters<typeof engineApi.updateRound>[1] }) =>
      engineApi.updateRound(roundId, updates),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["rounds", variables.competitionId] });
    },
  });
}

export function useRemoveRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, competitionId }: { roundId: string; competitionId: string }) =>
      engineApi.removeRound(roundId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["rounds", variables.competitionId] });
    },
  });
}

// ── Heats ─────────────────────────────────────────────────────────────

export function useHeats(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["heats", competitionId],
    queryFn: () => engineApi.fetchHeats(competitionId!),
    enabled: !!competitionId,
  });
}

export function useAddHeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddHeatInput) => engineApi.addHeat(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["heats", variables.competition_id] });
    },
  });
}

export function useUpdateHeatStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ heatId, status, competitionId }: { heatId: string; status: string; competitionId: string }) =>
      engineApi.updateHeatStatus(heatId, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["heats", variables.competitionId] });
    },
  });
}

// ── Heat Assignments ──────────────────────────────────────────────────

export function useHeatAssignments(heatId: string | undefined) {
  return useQuery({
    queryKey: ["heat-assignments", heatId],
    queryFn: () => engineApi.fetchHeatAssignments(heatId!),
    enabled: !!heatId,
  });
}

export function useAssignTeamToHeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ heatId, teamId, laneNumber }: { heatId: string; teamId: string; laneNumber?: number }) =>
      engineApi.assignTeamToHeat(heatId, teamId, laneNumber),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["heat-assignments", variables.heatId] });
    },
  });
}

// ── Judge Assignments ─────────────────────────────────────────────────

export function useJudgeAssignments(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["judge-assignments", competitionId],
    queryFn: () => engineApi.fetchJudgeAssignments(competitionId!),
    enabled: !!competitionId,
  });
}

export function useAssignJudge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignJudgeInput) => engineApi.assignJudge(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["judge-assignments", variables.competition_id] });
    },
  });
}

// ── Templates ─────────────────────────────────────────────────────────

export function useCompetitionTemplates() {
  return useQuery({
    queryKey: ["competition-templates"],
    queryFn: engineApi.fetchTemplates,
  });
}

// ── Workout Rankings (cached, read-only) ──────────────────────────────

export function useWorkoutRankings(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["workout-rankings", competitionId],
    queryFn: () => engineApi.fetchWorkoutRankings(competitionId!),
    enabled: !!competitionId,
  });
}

// ── Cached Leaderboard ────────────────────────────────────────────────

export function useCachedLeaderboard(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["cached-leaderboard", competitionId],
    queryFn: () => engineApi.fetchCachedLeaderboard(competitionId!),
    enabled: !!competitionId,
  });
}

// ── Score Submission via Edge Function ─────────────────────────────────

export interface SubmitScoreInput {
  competition_id: string;
  workout_id: string;
  team_id: string;
  score?: number;
  reps_completed?: number | null;
  time_seconds?: number | null;
  load_value?: number | null;
  points_awarded?: number | null;
  heat_id?: string | null;
  round_id?: string | null;
  notes?: string | null;
  video_url?: string | null;
  device_id?: string | null;
  idempotency_key?: string | null;
}

export function useSubmitScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitScoreInput) => {
      const { data, error } = await supabase.functions.invoke("score-submission", {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["scores", variables.competition_id] });
      qc.invalidateQueries({ queryKey: ["workout-rankings", variables.competition_id] });
    },
  });
}

// ── Score Validation via Edge Function ─────────────────────────────────

export function useValidateScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scoreId, competitionId, action }: { scoreId: string; competitionId: string; action: "validate" | "reject" }) => {
      const { data, error } = await supabase.functions.invoke("score-validate", {
        body: { score_id: scoreId, competition_id: competitionId, action },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["scores", variables.competitionId] });
      qc.invalidateQueries({ queryKey: ["workout-rankings", variables.competitionId] });
      qc.invalidateQueries({ queryKey: ["cached-leaderboard", variables.competitionId] });
    },
  });
}

// ── Leaderboard Recompute via Edge Function ───────────────────────────

export function useRecomputeLeaderboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ competitionId, workoutId }: { competitionId: string; workoutId?: string }) => {
      const { data, error } = await supabase.functions.invoke("leaderboard-recompute", {
        body: { competition_id: competitionId, workout_id: workoutId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["workout-rankings", variables.competitionId] });
      qc.invalidateQueries({ queryKey: ["cached-leaderboard", variables.competitionId] });
    },
  });
}

// ── Audit Events ──────────────────────────────────────────────────────

export function useAuditEvents(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["audit-events", competitionId],
    queryFn: () => engineApi.fetchAuditEvents(competitionId!),
    enabled: !!competitionId,
  });
}

// ── Realtime subscription for leaderboard ─────────────────────────────

export function useRealtimeLeaderboard(competitionId: string | undefined, onUpdate: () => void) {
  // Subscribe to competition_leaderboards changes
  if (!competitionId) return;

  const channel = supabase
    .channel(`leaderboard-${competitionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "competition_leaderboards",
        filter: `competition_id=eq.${competitionId}`,
      },
      () => onUpdate()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "workout_rankings",
        filter: `competition_id=eq.${competitionId}`,
      },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
