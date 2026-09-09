import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LandingStat {
  value: string;
  label: string;
}

export function useLandingStats() {
  const [stats, setStats] = useState<LandingStat[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [comps, programs, gyms] = await Promise.all([
        supabase
          .from("competitions")
          .select("id", { count: "exact", head: true })
          .in("status", ["published", "live", "completed"]),
        supabase.from("programs").select("id", { count: "exact", head: true }),
        supabase.from("gyms").select("id", { count: "exact", head: true }),
      ]);

      if (cancelled) return;

      const next: LandingStat[] = [
        { value: String(comps.count ?? 0), label: "Competitions run" },
        { value: String(programs.count ?? 0), label: "Training programs" },
        { value: String(gyms.count ?? 0), label: "Gyms on board" },
      ].filter((s) => s.value !== "0");

      setStats(next);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}

export interface LandingTier {
  id: string;
  name: string;
  price: string;
  period: string | null;
  is_popular: boolean;
  features: { label: string; included: boolean }[];
}

export function useLandingTiers() {
  const [tiers, setTiers] = useState<LandingTier[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: rows } = await supabase
        .from("pricing_tiers")
        .select("id, name, price, period, is_popular, sort_order")
        .eq("is_active", true)
        .eq("is_public", true)
        .order("sort_order");

      if (!rows?.length) return;

      const { data: feats } = await supabase
        .from("pricing_features")
        .select("tier_id, label, included, sort_order")
        .in(
          "tier_id",
          rows.map((r) => r.id),
        )
        .order("sort_order");

      if (cancelled) return;

      setTiers(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          price: r.price ?? "",
          period: r.period,
          is_popular: Boolean(r.is_popular),
          features: (feats ?? [])
            .filter((f) => f.tier_id === r.id)
            .map((f) => ({ label: f.label, included: Boolean(f.included) })),
        })),
      );
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return tiers;
}
