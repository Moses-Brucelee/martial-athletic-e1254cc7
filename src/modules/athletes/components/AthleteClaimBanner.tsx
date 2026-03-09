import { useAuth } from "@/components/AuthProvider";
import { useUnlinkedAthletes, useClaimAthlete } from "@/modules/athletes/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { Athlete } from "@/domain/competition";

interface AthleteClaimBannerProps {
  userEmail: string;
}

export function AthleteClaimBanner({ userEmail }: AthleteClaimBannerProps) {
  const { user } = useAuth();
  const { data: unlinked = [], isLoading } = useUnlinkedAthletes(userEmail);
  const claimMutation = useClaimAthlete();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (isLoading || !user) return null;

  const visible = unlinked.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const handleClaim = async (athlete: Athlete) => {
    try {
      await claimMutation.mutateAsync({ athleteId: athlete.id, userId: user.id });
      toast.success(`Claimed profile: ${athlete.name}`);
    } catch {
      toast.error("Failed to claim profile. It may have already been claimed.");
    }
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Competition Results Found</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        We found competition records that may belong to you. Claim them to build your competition history.
      </p>

      <div className="space-y-2">
        {visible.map((athlete) => (
          <div
            key={athlete.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border border-border"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{athlete.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {athlete.email && (
                  <span className="text-xs text-muted-foreground">{athlete.email}</span>
                )}
                <Badge variant="outline" className="text-[10px]">Unlinked</Badge>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={() => handleClaim(athlete)}
                disabled={claimMutation.isPending}
                className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" /> Claim
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(athlete.id)}
                className="h-8 w-8 p-0 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
