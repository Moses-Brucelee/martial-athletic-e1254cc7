import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import * as api from "./api";

export function useModuleProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => api.fetchProfile(user!.id),
    enabled: !!user,
  });
}

export function useModuleCompetitionRole(competitionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competition-role", competitionId, user?.id],
    queryFn: () => api.checkCompetitionRole(competitionId!, user!.id),
    enabled: !!competitionId && !!user,
  });
}
