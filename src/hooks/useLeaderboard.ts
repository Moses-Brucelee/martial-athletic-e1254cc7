import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompetitionLeaderboard } from "@/data/leaderboard";
import type { LeaderboardEntry } from "@/domain/scoring";

export function useLeaderboard(competitionId: string | undefined) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!competitionId) return;
    try {
      const data = await fetchCompetitionLeaderboard(competitionId);
      setEntries(data);
    } catch {
      // silent fail — leaderboard is non-critical
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription for auto-refresh
  useEffect(() => {
    if (!competitionId) return;

    const channel = supabase
      .channel(`leaderboard-${competitionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "competition_scores",
          filter: `competition_id=eq.${competitionId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [competitionId, refresh]);

  return { entries, loading, refresh };
}
