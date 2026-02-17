import { useNavigate } from "react-router-dom";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PricingFeature {
  id: string;
  label: string;
  included: boolean;
  sort_order: number;
}

interface PricingTier {
  id: string;
  key: string;
  name: string;
  price: string;
  period: string;
  is_popular: boolean;
  sort_order: number;
  features: PricingFeature[];
}

export default function UpgradePackage() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const currentTier = profile?.subscription_tier ?? "free";

  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [tiersError, setTiersError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTiers = async () => {
      setTiersLoading(true);
      setTiersError(null);

      const { data: tierData, error: tierError } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("is_active", true)
        .eq("is_public", true)
        .order("sort_order");

      if (tierError) {
        setTiersError(tierError.message);
        setTiersLoading(false);
        return;
      }

      if (!tierData || tierData.length === 0) {
        setTiers([]);
        setTiersLoading(false);
        return;
      }

      const tierIds = tierData.map((t) => t.id);
      const { data: featureData, error: featureError } = await supabase
        .from("pricing_features")
        .select("*")
        .in("tier_id", tierIds)
        .order("sort_order");

      if (featureError) {
        setTiersError(featureError.message);
        setTiersLoading(false);
        return;
      }

      const featuresByTier: Record<string, PricingFeature[]> = {};
      (featureData ?? []).forEach((f) => {
        if (!featuresByTier[f.tier_id]) featuresByTier[f.tier_id] = [];
        featuresByTier[f.tier_id].push(f);
      });

      setTiers(
        tierData.map((t) => ({
          id: t.id,
          key: t.key,
          name: t.name,
          price: t.price,
          period: t.period,
          is_popular: t.is_popular,
          sort_order: t.sort_order,
          features: featuresByTier[t.id] ?? [],
        }))
      );
      setTiersLoading(false);
    };

    fetchTiers();
  }, []);

  const loading = profileLoading || tiersLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <main className="max-w-5xl mx-auto px-4 py-10 grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </main>
      </div>
    );
  }

  if (tiersError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <CompetitionHeader
          title="UPGRADE"
          subscriptionTier={currentTier}
          avatarUrl={profile?.avatar_url}
          displayName={profile?.display_name}
        />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-muted-foreground">Failed to load pricing tiers.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const handleUpgrade = (tierKey: string) => {
    toast.info("Payment integration coming soon. Stay tuned!");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CompetitionHeader
        title="UPGRADE"
        subscriptionTier={currentTier}
        avatarUrl={profile?.avatar_url}
        displayName={profile?.display_name}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        {tiers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No pricing tiers available at the moment.</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${tiers.length === 1 ? "md:grid-cols-1 max-w-md mx-auto" : tiers.length === 2 ? "md:grid-cols-2 max-w-2xl mx-auto" : "md:grid-cols-3"}`}>
            {tiers.map((tier) => {
              const isCurrent = currentTier === tier.key;
              const cardBorder = tier.is_popular
                ? "border-primary"
                : "border-border";

              return (
                <Card
                  key={tier.id}
                  className={`relative flex flex-col ${cardBorder} ${
                    tier.is_popular ? "border-2 shadow-lg shadow-primary/10" : ""
                  }`}
                >
                  {tier.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Crown className="h-3 w-3" />
                        MOST POPULAR
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pt-8 pb-2">
                    <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                      {tier.name}
                    </p>
                    <div className="mt-2">
                      <span className="text-4xl font-extrabold text-foreground">
                        {tier.price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {tier.period}
                      </span>
                    </div>
                    {isCurrent && (
                      <Badge variant="secondary" className="mt-3 mx-auto">
                        CURRENT PLAN
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 pt-4">
                    <ul className="space-y-3">
                      {tier.features.map((f) => (
                        <li key={f.id} className="flex items-center gap-2 text-sm">
                          {f.included ? (
                            <Check className="h-4 w-4 text-accent shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          )}
                          <span
                            className={
                              f.included
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                            }
                          >
                            {f.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-2 pb-6">
                    <Button
                      className="w-full font-bold uppercase tracking-wide"
                      variant={tier.is_popular ? "default" : "outline"}
                      disabled={isCurrent}
                      onClick={() => handleUpgrade(tier.key)}
                    >
                      {isCurrent ? "CURRENT PLAN" : "UPGRADE"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            ← Back to Main Menu
          </Button>
        </div>
      </main>
    </div>
  );
}
