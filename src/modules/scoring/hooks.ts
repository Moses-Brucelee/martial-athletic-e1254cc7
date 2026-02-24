import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as api from "./api";
import type { ScoreUpsert } from "./api";

export function useScores(competitionId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["scores", competitionId],
    queryFn: () => api.fetchScores(competitionId!),
    enabled: !!competitionId,
  });

  // Realtime subscription — invalidate cache on any score change
  useEffect(() => {
    if (!competitionId) return;

    const channel = supabase
      .channel(`scores-rt-${competitionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "competition_scores",
          filter: `competition_id=eq.${competitionId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["scores", competitionId] });
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

export function useUpsertScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scores: ScoreUpsert[]) => api.upsertScores(scores),
    onSuccess: (_data, variables) => {
      const competitionId = variables[0]?.competition_id;
      if (competitionId) {
        qc.invalidateQueries({ queryKey: ["scores", competitionId] });
        qc.invalidateQueries({ queryKey: ["leaderboard", competitionId] });
      }
    },
  });
}

export function useLockWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutId, competitionId }: { workoutId: string; competitionId: string }) =>
      api.lockWorkout(workoutId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["workouts", variables.competitionId] });
    },
  });
}

export function useUnlockWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workoutId, competitionId }: { workoutId: string; competitionId: string }) =>
      api.unlockWorkout(workoutId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["workouts", variables.competitionId] });
    },
  });
}
