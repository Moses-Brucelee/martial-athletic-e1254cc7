import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import * as api from "./api";
import type { Program, WorkoutSession } from "./types";

const KEYS = {
  library: (category: string, search: string) => ["programs", "library", category, search],
  authored: (userId?: string) => ["programs", "authored", userId],
  tree: (id?: string) => ["programs", "tree", id],
  enrollments: (userId?: string) => ["programs", "enrollments", userId],
  sessions: (userId?: string) => ["programs", "sessions", userId],
  openSession: (userId?: string) => ["programs", "open-session", userId],
  sessionDetail: (id?: string) => ["programs", "session", id],
  movements: ["programs", "movements"],
  history: (userId?: string) => ["programs", "movement-history", userId],
  roster: (id?: string) => ["programs", "roster", id],
  programSessions: (id?: string) => ["programs", "program-sessions", id],
};

export function useProgramLibrary(category: string, search: string) {
  return useQuery({
    queryKey: KEYS.library(category, search),
    queryFn: () => api.listPrograms({ category, search, limit: 24 }),
    staleTime: 60_000,
  });
}

export function useAuthoredPrograms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.authored(user?.id),
    queryFn: () => api.fetchMyAuthoredPrograms(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useProgramTree(programId?: string) {
  return useQuery({
    queryKey: KEYS.tree(programId),
    queryFn: () => api.fetchProgramTree(programId!),
    enabled: !!programId,
    staleTime: 30_000,
  });
}

export function useEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.enrollments(user?.id),
    queryFn: () => api.fetchEnrollments(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useRecentSessions(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEYS.sessions(user?.id), limit],
    queryFn: () => api.fetchRecentSessions(user!.id, limit),
    enabled: !!user?.id,
    staleTime: 15_000,
  });
}

export function useOpenSession() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.openSession(user?.id),
    queryFn: () => api.fetchOpenSession(user!.id),
    enabled: !!user?.id,
    staleTime: 10_000,
  });
}

export function useSessionDetail(sessionId?: string) {
  return useQuery({
    queryKey: KEYS.sessionDetail(sessionId),
    queryFn: () => api.fetchSessionDetail(sessionId!),
    enabled: !!sessionId,
  });
}

export function useMovements() {
  return useQuery({
    queryKey: KEYS.movements,
    queryFn: api.fetchMovements,
    staleTime: 10 * 60_000,
  });
}

/**
 * Smart defaults — the athlete's own movement history, cached and reused so
 * we never ask for information the system already knows.
 */
export function useMovementHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.history(user?.id),
    queryFn: () => api.fetchMovementHistory(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

export function useProgramRoster(programId?: string) {
  return useQuery({
    queryKey: KEYS.roster(programId),
    queryFn: () => api.fetchProgramRoster(programId!),
    enabled: !!programId,
  });
}

export function useProgramSessions(programId?: string) {
  return useQuery({
    queryKey: KEYS.programSessions(programId),
    queryFn: () => api.fetchProgramSessions(programId!),
    enabled: !!programId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────

export function useCreateProgram() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<Parameters<typeof api.createProgram>[0], "userId">) =>
      api.createProgram({ ...input, userId: user!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programs"] });
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Program> }) =>
      api.updateProgram(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProgram(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}

export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createWorkout,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs", "tree"] }),
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWorkout(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs", "tree"] }),
  });
}

export function useEnroll() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (programId: string) => api.enrollInProgram(programId, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs", "enrollments"] }),
  });
}

export function useLeaveProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => api.leaveProgram(enrollmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs", "enrollments"] }),
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<Parameters<typeof api.startSession>[0], "userId">) =>
      api.startSession({ ...input, userId: user!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programs", "sessions"] });
      qc.invalidateQueries({ queryKey: ["programs", "open-session"] });
    },
  });
}

export function useLogResult(sessionId?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<Parameters<typeof api.logExerciseResult>[0], "userId" | "sessionId">) =>
      api.logExerciseResult({ ...input, userId: user!.id, sessionId: sessionId! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programs", "session", sessionId] });
      qc.invalidateQueries({ queryKey: ["programs", "movement-history"] });
    },
  });
}

export function useFinishSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, duration, notes }: { id: string; duration: number; notes?: string }) =>
      api.finishSession(id, duration, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programs"] });
    },
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WorkoutSession> }) =>
      api.updateSession(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}
