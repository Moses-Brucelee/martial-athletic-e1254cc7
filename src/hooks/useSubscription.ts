import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";

interface TierInfo {
  key: string;
  name: string;
  sort_order: number;
}

export function useSubscription() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [tierKey, setTierKey] = useState("free");
  const [tierName, setTierName] = useState("FREE");
  const [allowedFeatures, setAllowedFeatures] = useState<Set<string>>(new Set());
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTierKey("free");
      setTierName("FREE");
      setAllowedFeatures(new Set());
      setIsSuperUser(false);
      setLoading(false);
      return;
    }

    if (profileLoading) return;

    const resolve = async () => {
      // Fetch all data in parallel
      const [tiersRes, featuresRes, superRes] = await Promise.all([
        supabase
          .from("pricing_tiers")
          .select("key, name, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("tier_feature_access")
          .select("tier_key, feature_key"),
        supabase
          .from("super_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const tiers: TierInfo[] = (tiersRes.data as TierInfo[]) ?? [];
      const featureRows = featuresRes.data ?? [];
      const isSuper = !!superRes.data;
      setIsSuperUser(isSuper);

      // Build feature map by tier_key
      const featuresByTier: Record<string, string[]> = {};
      for (const row of featureRows) {
        if (!featuresByTier[row.tier_key]) featuresByTier[row.tier_key] = [];
        featuresByTier[row.tier_key].push(row.feature_key);
      }

      // Resolve user's current tier key
      let resolvedKey = "free";

      const { data: subData } = await supabase
        .from("user_subscriptions")
        .select("tier_id, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (subData?.tier_id) {
        const { data: tierData } = await supabase
          .from("pricing_tiers")
          .select("key")
          .eq("id", subData.tier_id)
          .single();
        if (tierData?.key) resolvedKey = tierData.key;
      } else {
        // Fallback to profile.subscription_tier
        const fallback = profile?.subscription_tier;
        if (fallback && tiers.some((t) => t.key === fallback)) {
          resolvedKey = fallback;
        }
      }

      setTierKey(resolvedKey);

      // Find tier name
      const matchedTier = tiers.find((t) => t.key === resolvedKey);
      setTierName(matchedTier?.name ?? "FREE");

      // Build allowed features set: include features from user's tier
      // and all tiers with lower sort_order (tier hierarchy)
      const userSortOrder = matchedTier?.sort_order ?? 0;
      const eligibleTierKeys = tiers
        .filter((t) => t.sort_order <= userSortOrder)
        .map((t) => t.key);

      const features = new Set<string>();
      for (const tk of eligibleTierKeys) {
        for (const fk of featuresByTier[tk] ?? []) {
          features.add(fk);
        }
      }
      setAllowedFeatures(features);
      setLoading(false);
    };

    resolve();
  }, [user, profile, profileLoading]);

  const canAccess = useCallback(
    (feature: string): boolean => {
      if (isSuperUser) return true;
      return allowedFeatures.has(feature);
    },
    [allowedFeatures, isSuperUser]
  );

  return {
    tierKey,
    tierName,
    tier: tierKey, // backward compat
    isAffiliatePro: tierKey === "affiliate_pro" || tierKey === "tournament_pro",
    isTournamentPro: tierKey === "tournament_pro",
    canAccess,
    loading: loading || profileLoading,
  };
}
