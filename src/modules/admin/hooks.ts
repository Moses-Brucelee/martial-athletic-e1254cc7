import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import * as api from "./api";

export function useSuperUser() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["super-user", user?.id],
    queryFn: () => api.checkIsSuperUser(user!.id),
    enabled: !!user,
  });
}

export function useJudges(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["judges", competitionId],
    queryFn: () => api.fetchJudges(competitionId!),
    enabled: !!competitionId,
  });
}

export function useAddJudge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, userId }: { competitionId: string; userId: string }) =>
      api.addJudge(competitionId, userId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["judges", variables.competitionId] });
      qc.invalidateQueries({ queryKey: ["competition-role"] });
    },
  });
}

export function useRemoveJudge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ judgeId, competitionId }: { judgeId: string; competitionId: string }) =>
      api.removeJudge(judgeId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["judges", variables.competitionId] });
      qc.invalidateQueries({ queryKey: ["competition-role"] });
    },
  });
}
