import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { CreateCompetitionInput, AddTeamInput, AddWorkoutInput, CreateBracketInput, SaveWorkoutWithMovementsInput } from "./types";

// ── Competition queries ───────────────────────────────────────────────

export function useCompetition(id: string | undefined) {
  return useQuery({
    queryKey: ["competition", id],
    queryFn: () => api.fetchCompetition(id!),
    enabled: !!id,
  });
}

export function useCompetitions() {
  return useQuery({
    queryKey: ["competitions"],
    queryFn: api.fetchCompetitions,
  });
}

export function useUserCompetitionCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["competition-count", userId],
    queryFn: () => api.fetchUserCompetitionCount(userId!),
    enabled: !!userId,
  });
}

export function useCreateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompetitionInput) => api.createCompetition(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
      qc.invalidateQueries({ queryKey: ["competition-count"] });
    },
  });
}

// ── Teams ─────────────────────────────────────────────────────────────

export function useTeams(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["teams", competitionId],
    queryFn: () => api.fetchTeams(competitionId!),
    enabled: !!competitionId,
  });
}

export function useAddTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddTeamInput) => api.addTeam(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["teams", variables.competition_id] });
    },
  });
}

export function useRemoveTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, competitionId }: { teamId: string; competitionId: string }) =>
      api.removeTeam(teamId, competitionId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["teams", variables.competitionId] });
    },
  });
}

// ── Workouts ──────────────────────────────────────────────────────────

export function useWorkouts(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["workouts", competitionId],
    queryFn: () => api.fetchWorkouts(competitionId!),
    enabled: !!competitionId,
  });
}

export function useAddWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddWorkoutInput) => api.addWorkout(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["workouts", variables.competition_id] });
    },
  });
}

export function useRemoveWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutId, competitionId }: { workoutId: string; competitionId: string }) =>
      api.removeWorkout(workoutId, competitionId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["workouts", variables.competitionId] });
    },
  });
}

export function useUpdateWorkoutMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutId, measurement, competitionId }: { workoutId: string; measurement: string; competitionId: string }) =>
      api.updateWorkoutMeasurement(workoutId, measurement),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["workouts", variables.competitionId] });
    },
  });
}

export function useSaveWorkouts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, workouts }: { competitionId: string; workouts: { workout_number: number; measurement_type: string }[] }) =>
      api.saveWorkouts(competitionId, workouts),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["workouts", variables.competitionId] });
    },
  });
}

// ── Workout Movements ─────────────────────────────────────────────────

export function useWorkoutMovements(workoutId: string | undefined) {
  return useQuery({
    queryKey: ["workout-movements", workoutId],
    queryFn: () => api.fetchWorkoutMovements(workoutId!),
    enabled: !!workoutId,
  });
}

export function useSaveWorkoutWithMovements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveWorkoutWithMovementsInput) => api.saveWorkoutWithMovements(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["workouts", variables.competition_id] });
    },
  });
}

// ── Divisions ─────────────────────────────────────────────────────────

export function useDivisions(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["divisions", competitionId],
    queryFn: () => api.fetchDivisions(competitionId!),
    enabled: !!competitionId,
  });
}

// ── Brackets ──────────────────────────────────────────────────────────

export function useBrackets(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["brackets", competitionId],
    queryFn: () => api.fetchBrackets(competitionId!),
    enabled: !!competitionId,
  });
}

export function useCreateBracket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBracketInput) => api.createBracket(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["brackets", variables.competition_id] });
    },
  });
}

// ── Bouts ─────────────────────────────────────────────────────────────

export function useBouts(bracketId: string | undefined) {
  return useQuery({
    queryKey: ["bouts", bracketId],
    queryFn: () => api.fetchBouts(bracketId!),
    enabled: !!bracketId,
  });
}

export function useUpdateBoutWinner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boutId, winnerId, bracketId }: { boutId: string; winnerId: string; bracketId: string }) =>
      api.updateBoutWinner(boutId, winnerId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["bouts", variables.bracketId] });
    },
  });
}

// ── Batch bracket operations ──────────────────────────────────────────

export function useGenerateBrackets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, brackets }: { competitionId: string; brackets: Parameters<typeof api.createBracketWithBouts>[1] }) =>
      api.createBracketWithBouts(competitionId, brackets),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["brackets", variables.competitionId] });
    },
  });
}

export function useDeleteBrackets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (competitionId: string) => api.deleteBrackets(competitionId),
    onSuccess: (_data, competitionId) => {
      qc.invalidateQueries({ queryKey: ["brackets", competitionId] });
    },
  });
}

// ── Competition status ────────────────────────────────────────────────

export function useUpdateCompetitionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateCompetitionStatus(id, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["competition", variables.id] });
      qc.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}
