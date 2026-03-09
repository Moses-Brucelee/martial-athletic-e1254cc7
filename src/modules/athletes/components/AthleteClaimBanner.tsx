import { useAuth } from "@/components/AuthProvider";
import { useUnlinkedAthletes, useClaimAthlete } from "@/modules/athletes/hooks";
import { findUnlinkedAthletesByName } from "@/modules/athletes/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserCheck, X, Link2, Search } from "lucide-react";
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

  // Name search state
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<Athlete[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNameSearch, setShowNameSearch] = useState(false);

  if (isLoading || !user) return null;

  const visible = unlinked.filter((a) => !dismissed.has(a.id));

  const handleClaim = async (athlete: Athlete) => {
    try {
      await claimMutation.mutateAsync({ athleteId: athlete.id, userId: user.id });
      toast.success(`Claimed profile: ${athlete.name}`);
      // Remove from name results too
      setNameResults((prev) => prev.filter((a) => a.id !== athlete.id));
    } catch {
      toast.error("Failed to claim profile. It may have already been claimed.");
    }
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const handleNameSearch = async () => {
    if (nameQuery.trim().length < 2) {
      toast.error("Enter at least 2 characters to search");
      return;
    }
    setSearching(true);
    try {
      const results = await findUnlinkedAthletesByName(nameQuery.trim());
      // Filter out already-shown email matches
      const emailIds = new Set(unlinked.map((a) => a.id));
      setNameResults(results.filter((a) => !emailIds.has(a.id)));
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const hasEmailMatches = visible.length > 0;
  const hasNameResults = nameResults.length > 0;

  if (!hasEmailMatches && !showNameSearch) {
    return (
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Have competition results under a different name?</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowNameSearch(true)} className="h-8 text-xs">
            <Search className="h-3 w-3 mr-1" /> Search by Name
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
      {/* Email-matched results */}
      {hasEmailMatches && (
        <>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Competition Results Found</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            We found competition records matching your email. Claim them to build your history.
          </p>
          <div className="space-y-2">
            {visible.map((athlete) => (
              <AthleteClaimRow
                key={athlete.id}
                athlete={athlete}
                onClaim={handleClaim}
                onDismiss={handleDismiss}
                isPending={claimMutation.isPending}
              />
            ))}
          </div>
        </>
      )}

      {/* Name search section */}
      <div className="pt-2 border-t border-primary/10">
        <button
          onClick={() => setShowNameSearch(!showNameSearch)}
          className="text-xs text-primary font-medium hover:underline"
        >
          {showNameSearch ? "Hide name search" : "Can't find your profile? Search by name →"}
        </button>

        {showNameSearch && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSearch()}
                  placeholder="Search by athlete name..."
                  className="pl-9 h-9 text-sm"
                  maxLength={100}
                />
              </div>
              <Button
                size="sm"
                onClick={handleNameSearch}
                disabled={searching || nameQuery.trim().length < 2}
                className="h-9"
              >
                {searching ? "..." : "Search"}
              </Button>
            </div>

            {hasNameResults ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {nameResults.length} unlinked profile{nameResults.length !== 1 ? "s" : ""} found
                </p>
                {nameResults.map((athlete) => (
                  <AthleteClaimRow
                    key={athlete.id}
                    athlete={athlete}
                    onClaim={handleClaim}
                    onDismiss={() => setNameResults((prev) => prev.filter((a) => a.id !== athlete.id))}
                    isPending={claimMutation.isPending}
                  />
                ))}
              </div>
            ) : nameQuery.length >= 2 && !searching ? (
              <p className="text-xs text-muted-foreground text-center py-2">No unlinked profiles found for "{nameQuery}"</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function AthleteClaimRow({
  athlete,
  onClaim,
  onDismiss,
  isPending,
}: {
  athlete: Athlete;
  onClaim: (a: Athlete) => void;
  onDismiss: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border border-border">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{athlete.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {athlete.email && <span className="text-xs text-muted-foreground">{athlete.email}</span>}
          {athlete.gender && <span className="text-xs text-muted-foreground capitalize">{athlete.gender}</span>}
          <Badge variant="outline" className="text-[10px]">Unlinked</Badge>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          onClick={() => onClaim(athlete)}
          disabled={isPending}
          className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
        >
          <UserCheck className="h-3.5 w-3.5 mr-1" /> Claim
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDismiss(athlete.id)}
          className="h-8 w-8 p-0 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
