import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";

type Tier = "free" | "affiliate_pro" | "tournament_pro";

const TIER_HIERARCHY: Tier[] = ["free", "affiliate_pro", "tournament_pro"];

const FEATURE_ACCESS: Record<string, Tier[]> = {
  view_profile: ["free", "affiliate_pro", "tournament_pro"],
  view_leaderboards: ["free", "affiliate_pro", "tournament_pro"],
  create_competitions: ["affiliate_pro", "tournament_pro"],
  manage_members: ["affiliate_pro", "tournament_pro"],
  link_gym_website: ["affiliate_pro", "tournament_pro"],
  manage_affiliation: ["affiliate_pro", "tournament_pro"],
  track_performances: ["affiliate_pro", "tournament_pro"],
  advanced_analytics: ["tournament_pro"],
  custom_branding: ["tournament_pro"],
};

export function useSubscription() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [tier, setTier] = useState<Tier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTier("free");
      setLoading(false);
      return;
    }

    if (profileLoading) return;

    const resolve = async () => {
      // Try user_subscriptions first
      const { data } = await supabase
        .from("user_subscriptions")
        .select("tier_id, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (data?.tier_id) {
        // Resolve tier key from pricing_tiers
        const { data: tierData } = await supabase
          .from("pricing_tiers")
          .select("key")
          .eq("id", data.tier_id)
          .single();

        if (tierData?.key && TIER_HIERARCHY.includes(tierData.key as Tier)) {
          setTier(tierData.key as Tier);
          setLoading(false);
          return;
        }
      }

      // Fallback to profile.subscription_tier
      const fallback = profile?.subscription_tier as Tier;
      setTier(TIER_HIERARCHY.includes(fallback) ? fallback : "free");
      setLoading(false);
    };

    resolve();
  }, [user, profile, profileLoading]);

  const canAccess = useCallback(
    (feature: string): boolean => {
      const allowed = FEATURE_ACCESS[feature];
      if (!allowed) return false;
      return allowed.includes(tier);
    },
    [tier]
  );

  return {
    tier,
    isAffiliatePro: tier === "affiliate_pro" || tier === "tournament_pro",
    isTournamentPro: tier === "tournament_pro",
    canAccess,
    loading: loading || profileLoading,
  };
}
