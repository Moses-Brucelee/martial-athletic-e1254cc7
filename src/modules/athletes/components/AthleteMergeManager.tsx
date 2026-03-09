import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Merge, AlertTriangle, CheckCircle2, User } from "lucide-react";
import { toast } from "sonner";
import { useSearchAthletesForMerge, useMergeAthletes } from "@/modules/athletes/hooks";
import type { Athlete } from "@/domain/competition";

export function AthleteMergeManager() {
  const [query, setQuery] = useState("");
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [secondaryId, setSecondaryId] = useState<string | null>(null);
  const { data: results = [], isLoading } = useSearchAthletesForMerge(query);
  const mergeMutation = useMergeAthletes();

  const primary = results.find((a) => a.id === primaryId);
  const secondary = results.find((a) => a.id === secondaryId);

  const handleMerge = async () => {
    if (!primaryId || !secondaryId) return;
    if (primaryId === secondaryId) {
      toast.error("Cannot merge an athlete with itself");
      return;
    }
    try {
      await mergeMutation.mutateAsync({ primaryId, secondaryId });
      toast.success("Athletes merged successfully");
      setPrimaryId(null);
      setSecondaryId(null);
    } catch {
      toast.error("Failed to merge athletes");
    }
  };

  const handleSelect = (athlete: Athlete) => {
    if (!primaryId) {
      setPrimaryId(athlete.id);
    } else if (!secondaryId && athlete.id !== primaryId) {
      setSecondaryId(athlete.id);
    }
  };

  const resetSelection = () => {
    setPrimaryId(null);
    setSecondaryId(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Merge className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Athlete Profile Merge</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Search for duplicate athletes, select a primary (keep) and secondary (merge into primary), then merge.
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>

        {/* Selection state */}
        {(primaryId || secondaryId) && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border">
            <span className="text-xs text-muted-foreground font-medium">
              {!primaryId ? "Select primary athlete →" :
               !secondaryId ? "Now select secondary (to merge) →" :
               "Ready to merge"}
            </span>
            {primary && (
              <Badge className="bg-green-500/10 text-green-600">
                Keep: {primary.name}
              </Badge>
            )}
            {secondary && (
              <Badge className="bg-destructive/10 text-destructive">
                Merge: {secondary.name}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={resetSelection} className="h-7 text-xs ml-auto">
              Reset
            </Button>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : query.length < 2 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Type at least 2 characters to search.
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No athletes found.</p>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {results.map((athlete) => {
              const isPrimary = athlete.id === primaryId;
              const isSecondary = athlete.id === secondaryId;

              return (
                <button
                  key={athlete.id}
                  onClick={() => handleSelect(athlete)}
                  disabled={isPrimary || isSecondary}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    isPrimary ? "border-green-500/50 bg-green-500/5" :
                    isSecondary ? "border-destructive/50 bg-destructive/5" :
                    "border-border bg-background hover:border-primary/30"
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{athlete.name}</p>
                    <div className="flex items-center gap-2">
                      {athlete.email && <span className="text-xs text-muted-foreground">{athlete.email}</span>}
                      {athlete.user_id ? (
                        <Badge variant="secondary" className="text-[10px]">Linked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Unlinked</Badge>
                      )}
                    </div>
                  </div>
                  {isPrimary && (
                    <Badge className="bg-green-500/10 text-green-600 text-[10px] shrink-0">Primary</Badge>
                  )}
                  {isSecondary && (
                    <Badge className="bg-destructive/10 text-destructive text-[10px] shrink-0">Merge</Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Merge confirmation */}
      {primaryId && secondaryId && (
        <div className="bg-card border border-destructive/30 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Confirm Merge</h4>
              <p className="text-xs text-muted-foreground mt-1">
                All registrations from <strong>{secondary?.name}</strong> will be transferred to{" "}
                <strong>{primary?.name}</strong>. The secondary record will be permanently deleted.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <p className="text-xs font-bold text-green-600 uppercase mb-1">Keep (Primary)</p>
              <p className="text-sm font-medium text-foreground">{primary?.name}</p>
              {primary?.email && <p className="text-xs text-muted-foreground">{primary.email}</p>}
              {primary?.user_id && <Badge variant="secondary" className="text-[10px] mt-1">Has Account</Badge>}
            </div>
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs font-bold text-destructive uppercase mb-1">Delete (Secondary)</p>
              <p className="text-sm font-medium text-foreground">{secondary?.name}</p>
              {secondary?.email && <p className="text-xs text-muted-foreground">{secondary.email}</p>}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleMerge}
              disabled={mergeMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              {mergeMutation.isPending ? "Merging…" : "Confirm Merge"}
            </Button>
            <Button variant="outline" onClick={resetSelection}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
