import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

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
      competitionId: string;
      teamId: string;
      athleteName: string;
      userId?: string;
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
      competitionId: string;
      teamId: string;
      userId: string;
      athleteName: string;
    }) => api.selfRegister(competitionId, teamId, userId, athleteName),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["participants", variables.competitionId] });
    },
  });
}
