import { useNavigate } from "react-router-dom";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const tiers = [
  {
    key: "free",
    name: "FREE",
    price: "$0",
    period: "forever",
    features: [
      { label: "1 competition", included: true },
      { label: "Basic dashboard", included: true },
      { label: "Community access", included: true },
      { label: "Unlimited competitions", included: false },
      { label: "Team management", included: false },
      { label: "Advanced analytics", included: false },
      { label: "Custom branding", included: false },
    ],
  },
  {
    key: "affiliate_pro",
    name: "AFFILIATE PRO",
    price: "$19",
    period: "/month",
    features: [
      { label: "1 competition", included: true },
      { label: "Basic dashboard", included: true },
      { label: "Community access", included: true },
      { label: "Unlimited competitions", included: true },
      { label: "Team management", included: true },
      { label: "Priority support", included: true },
      { label: "Custom branding", included: false },
    ],
  },
  {
    key: "tournament_pro",
    name: "TOURNAMENT PRO",
    price: "$49",
    period: "/month",
    popular: true,
    features: [
      { label: "1 competition", included: true },
      { label: "Basic dashboard", included: true },
      { label: "Community access", included: true },
      { label: "Unlimited competitions", included: true },
      { label: "Team management", included: true },
      { label: "Advanced analytics", included: true },
      { label: "Custom branding", included: true },
    ],
  },
];

export default function UpgradePackage() {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();
  const currentTier = profile?.subscription_tier ?? "free";

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
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => {
            const isCurrent = currentTier === tier.key;
            const cardBorder =
              tier.key === "tournament_pro"
                ? "border-primary"
                : tier.key === "affiliate_pro"
                ? "border-accent"
                : "border-border";

            return (
              <Card
                key={tier.key}
                className={`relative flex flex-col ${cardBorder} ${
                  tier.popular ? "border-2 shadow-lg shadow-primary/10" : ""
                }`}
              >
                {tier.popular && (
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
                    <Badge
                      variant="secondary"
                      className="mt-3 mx-auto"
                    >
                      CURRENT PLAN
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="flex-1 pt-4">
                  <ul className="space-y-3">
                    {tier.features.map((f) => (
                      <li key={f.label} className="flex items-center gap-2 text-sm">
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
                    variant={
                      tier.key === "tournament_pro"
                        ? "default"
                        : "outline"
                    }
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

        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            ← Back to Main Menu
          </Button>
        </div>
      </main>
    </div>
  );
}
