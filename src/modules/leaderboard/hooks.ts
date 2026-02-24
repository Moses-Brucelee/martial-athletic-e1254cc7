import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as api from "./api";

export function useLeaderboard(competitionId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["leaderboard", competitionId],
    queryFn: () => api.fetchCompetitionLeaderboard(competitionId!),
    enabled: !!competitionId,
  });

  // Realtime: auto-refresh leaderboard on score changes
  useEffect(() => {
    if (!competitionId) return;

    const channel = supabase
      .channel(`leaderboard-rt-${competitionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "competition_scores",
          filter: `competition_id=eq.${competitionId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["leaderboard", competitionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [competitionId, qc]);

  return query;
}

export function useSeasonLeaderboard(seasonId: string | undefined) {
  return useQuery({
    queryKey: ["season-leaderboard", seasonId],
    queryFn: () => api.fetchSeasonLeaderboard(seasonId!),
    enabled: !!seasonId,
  });
}
