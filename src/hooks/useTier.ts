import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export interface TierInfo {
  slug: string;
  display_name: string;
  sort_order: number;
}

const FREE_FALLBACK: TierInfo = { slug: "free", display_name: "Free", sort_order: 0 };

async function fetchUserTier(userId: string): Promise<{ tier: TierInfo; tiers: TierInfo[] }> {
  const [{ data: profile }, { data: tierRows }] = await Promise.all([
    supabase.from("profiles").select("tier_slug").eq("user_id", userId).maybeSingle(),
    supabase.from("pricing_tiers").select("key, name, sort_order").eq("is_active", true),
  ]);

  const tiers: TierInfo[] = (tierRows ?? []).map((t: any) => ({
    slug: t.key,
    display_name: t.name,
    sort_order: t.sort_order,
  }));

  const slug = (profile as any)?.tier_slug ?? "free";
  const tier = tiers.find((t) => t.slug === slug) ?? FREE_FALLBACK;
  return { tier, tiers };
}

export function useTier() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user-tier", user?.id],
    queryFn: () => fetchUserTier(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const tier = query.data?.tier ?? FREE_FALLBACK;
  const tiers = query.data?.tiers ?? [];

  const isAtLeast = (slug: string): boolean => {
    const target = tiers.find((t) => t.slug === slug);
    if (!target) return false;
    return tier.sort_order >= target.sort_order;
  };

  return { tier, tiers, isAtLeast, loading: query.isLoading };
}
