import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { CompetitionRole } from "@/domain/judges";

export function useCompetitionRole(competitionId: string | undefined) {
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [isJudge, setIsJudge] = useState(false);
  const [role, setRole] = useState<CompetitionRole>("viewer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !competitionId) {
      setLoading(false);
      return;
    }

    const check = async () => {
      const [compRes, judgeRes] = await Promise.all([
        supabase
          .from("competitions")
          .select("created_by")
          .eq("id", competitionId)
          .single(),
        supabase
          .from("competition_judges")
          .select("id")
          .eq("competition_id", competitionId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const owner = compRes.data?.created_by === user.id;
      const judge = !!judgeRes.data;

      setIsOwner(owner);
      setIsJudge(judge);
      setRole(owner ? "owner" : judge ? "judge" : "viewer");
      setLoading(false);
    };

    check();
  }, [user, competitionId]);

  return { isOwner, isJudge, role, loading };
}
