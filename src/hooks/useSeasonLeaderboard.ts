import { useState, useEffect } from "react";
import { fetchSeasonLeaderboard } from "@/data/leaderboard";
import type { SeasonRanking } from "@/domain/scoring";

export function useSeasonLeaderboard(seasonId: string | undefined) {
  const [entries, setEntries] = useState<SeasonRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seasonId) {
      setLoading(false);
      return;
    }

    fetchSeasonLeaderboard(seasonId)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [seasonId]);

  return { entries, loading };
}
