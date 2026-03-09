import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

// ── Participants (legacy) ─────────────────────────────────

export function useParticipants(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["participants", competitionId],
    queryFn: () => api.fetchParticipants(competitionId!),
    enabled: !!competitionId,
  });
}

export function useAddParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, teamId, athleteName, userId }: {
      competitionId: string; teamId: string; athleteName: string; userId?: string;
    }) => api.addParticipant(competitionId, teamId, athleteName, userId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["participants", variables.competitionId] });
    },
  });
}

export function useRemoveParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, competitionId }: { participantId: string; competitionId: string }) =>
      api.removeParticipant(participantId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["participants", variables.competitionId] });
    },
  });
}

export function useSelfRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, teamId, userId, athleteName }: {
      competitionId: string; teamId: string; userId: string; athleteName: string;
    }) => api.selfRegister(competitionId, teamId, userId, athleteName),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["participants", variables.competitionId] });
    },
  });
}

// ── Registrations (extended) ──────────────────────────────

export function useRegistrations(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["registrations", competitionId],
    queryFn: () => api.fetchRegistrations(competitionId!),
    enabled: !!competitionId,
  });
}

export function useCreateRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createRegistration,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["registrations", variables.competition_id] });
    },
  });
}

export function useUpdateRegistrationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, competitionId }: { id: string; status: string; competitionId: string }) =>
      api.updateRegistrationStatus(id, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["registrations", variables.competitionId] });
    },
  });
}

export function useUpdateRegistrationDivision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, divisionId, competitionId }: { id: string; divisionId: string; competitionId: string }) =>
      api.updateRegistrationDivision(id, divisionId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["registrations", variables.competitionId] });
    },
  });
}

export function useBulkUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status, competitionId }: { ids: string[]; status: string; competitionId: string }) =>
      api.bulkUpdateStatus(ids, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["registrations", variables.competitionId] });
    },
  });
}

// ── Athletes ──────────────────────────────────────────────

export function useAthletes() {
  return useQuery({
    queryKey: ["athletes"],
    queryFn: api.fetchAthletes,
  });
}

export function useCreateAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createAthlete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athletes"] });
    },
  });
}

// ── Profile Claiming ──────────────────────────────────────

export function useUnlinkedAthletes(email: string | undefined) {
  return useQuery({
    queryKey: ["unlinked-athletes", email],
    queryFn: () => api.findUnlinkedAthletes(email!),
    enabled: !!email,
  });
}

export function useLinkedAthletes(userId: string | undefined) {
  return useQuery({
    queryKey: ["linked-athletes", userId],
    queryFn: () => api.getLinkedAthletes(userId!),
    enabled: !!userId,
  });
}

export function useClaimAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ athleteId, userId }: { athleteId: string; userId: string }) =>
      api.claimAthleteProfile(athleteId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unlinked-athletes"] });
      qc.invalidateQueries({ queryKey: ["linked-athletes"] });
      qc.invalidateQueries({ queryKey: ["competition-history"] });
    },
  });
}

// ── Competition History ───────────────────────────────────

export function useCompetitionHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ["competition-history", userId],
    queryFn: () => api.fetchCompetitionHistory(userId!),
    enabled: !!userId,
  });
}

export function useAthleteScores(userId: string | undefined) {
  return useQuery({
    queryKey: ["athlete-scores", userId],
    queryFn: () => api.fetchAthleteScores(userId!),
    enabled: !!userId,
  });
}

// ── Athlete Competition Scores ─────────────────────────────

export function useAthleteCompetitionScores(userId: string | undefined, competitionId: string | undefined) {
  return useQuery({
    queryKey: ["athlete-competition-scores", userId, competitionId],
    queryFn: async () => {
      const { fetchAthleteCompetitionScores } = await import("./api-scores");
      return fetchAthleteCompetitionScores(userId!, competitionId!);
    },
    enabled: !!userId && !!competitionId,
  });
}

// ── Athlete Editing ───────────────────────────────────────

export function useUpdateAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ athleteId, updates }: {
      athleteId: string;
      updates: { name?: string; email?: string | null; phone?: string | null; gender?: string | null; date_of_birth?: string | null };
    }) => {
      const { updateAthlete } = await import("./api-edit");
      return updateAthlete(athleteId, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linked-athletes"] });
      qc.invalidateQueries({ queryKey: ["athletes"] });
    },
  });
}

// ── Admin: Merge ──────────────────────────────────────────

export function useSearchAthletesForMerge(query: string) {
  return useQuery({
    queryKey: ["athletes-search", query],
    queryFn: () => api.searchAthletesForMerge(query),
    enabled: query.length >= 2,
  });
}

export function useMergeAthletes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) =>
      api.mergeAthletes(primaryId, secondaryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["athletes"] });
      qc.invalidateQueries({ queryKey: ["athletes-search"] });
    },
  });
}
