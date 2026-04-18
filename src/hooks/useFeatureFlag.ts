import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSuperUserAccess } from "@/hooks/useSuperUserAccess";
import {
  type FeatureFlagKey,
  resolveStaticFlag,
  FEATURE_FLAG_DEFAULTS,
} from "@/lib/featureFlags";

interface FlagRow {
  key: string;
  enabled: boolean | null;
  audience: string;
}

/**
 * Fetches all feature flags from the DB once and caches them.
 * Used by both useFeatureFlag (single) and FeatureFlagsManager (admin UI).
 */
export function useAllFeatureFlags() {
  return useQuery({
    queryKey: ["feature_flags"],
    queryFn: async (): Promise<Record<string, FlagRow>> => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("key, enabled, audience");
      if (error) throw error;
      const map: Record<string, FlagRow> = {};
      for (const row of data ?? []) map[row.key] = row as FlagRow;
      return map;
    },
    staleTime: 60_000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

/**
 * Resolve a single feature flag.
 * Priority: super-user override → DB → env → code default.
 */
export function useFeatureFlag(key: FeatureFlagKey): {
  enabled: boolean;
  loading: boolean;
  isSuperUserOverride: boolean;
} {
  const { isSuperUser, loading: superLoading } = useSuperUserAccess();
  const { data, isLoading } = useAllFeatureFlags();

  // Super users always see everything (preview mode)
  if (isSuperUser) {
    return { enabled: true, loading: false, isSuperUserOverride: true };
  }

  if (isLoading || superLoading) {
    // Optimistic: assume code default while loading to avoid flicker on enabled features
    return {
      enabled: resolveStaticFlag(key),
      loading: true,
      isSuperUserOverride: false,
    };
  }

  const row = data?.[key];
  if (row && row.enabled !== null) {
    return { enabled: row.enabled, loading: false, isSuperUserOverride: false };
  }

  return {
    enabled: resolveStaticFlag(key),
    loading: false,
    isSuperUserOverride: false,
  };
}

/** Resolve multiple flags at once (no extra fetches). */
export function useFeatureFlags(): {
  flags: Record<FeatureFlagKey, boolean>;
  loading: boolean;
  isSuperUser: boolean;
} {
  const { isSuperUser, loading: superLoading } = useSuperUserAccess();
  const { data, isLoading } = useAllFeatureFlags();

  const flags = {} as Record<FeatureFlagKey, boolean>;
  for (const key of Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlagKey[]) {
    if (isSuperUser) {
      flags[key] = true;
      continue;
    }
    const row = data?.[key];
    flags[key] = row && row.enabled !== null ? row.enabled : resolveStaticFlag(key);
  }

  return { flags, loading: isLoading || superLoading, isSuperUser };
}
