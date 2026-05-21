import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useTier } from "@/hooks/useTier";
import { useAuth } from "@/components/AuthProvider";
import { useCompetitions } from "@/modules/tournaments/hooks";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Plus, Calendar, MapPin, ChevronRight } from "lucide-react";
import { deriveStatus, getStatusLabel, getStatusColor, type CompetitionStatus } from "@/modules/tournaments/stateMachine";
import type { Competition } from "@/domain/competition";

function groupCompetitions(comps: Competition[]) {
  const now = new Date();
  const upcoming: Competition[] = [];
  const live: Competition[] = [];
  const completed: Competition[] = [];

  for (const c of comps) {
    const status = deriveStatus(c);
    if (status === "live") live.push(c);
    else if (status === "completed") completed.push(c);
    else upcoming.push(c); // draft + published
  }

  return { upcoming, live, completed };
}

function CompetitionCard({ comp, onClick }: { comp: Competition; onClick: () => void }) {
  const status = deriveStatus(comp);
  const displayDate = comp.start_date || comp.date;

  return (
    <button onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-bold text-foreground">{comp.name}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {displayDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(displayDate).toLocaleDateString()}
              </span>
            )}
            {comp.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {comp.venue}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${getStatusColor(status)}`}>
              {getStatusLabel(status)}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}

function Section({ title, comps, navigate }: { title: string; comps: Competition[]; navigate: (path: string) => void }) {
  if (comps.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{title}</h3>
      {comps.map((comp) => (
        <CompetitionCard key={comp.id} comp={comp} onClick={() => navigate(`/competition/${comp.id}`)} />
      ))}
    </div>
  );
}

export default function CompetitionList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { isAtLeast, loading: tierLoading } = useTier();
  const { data: competitionsRaw = [], isLoading, error } = useCompetitions();
  const canCreate = isAtLeast("affiliate_pro");

  // Free-tier non-owners only see published-or-later competitions (no drafts).
  const isFree = !isAtLeast("affiliate_pro");
  const competitions = isFree
    ? competitionsRaw.filter((c) => c.created_by === user?.id || deriveStatus(c) !== "draft")
    : competitionsRaw;

  if (profileLoading || isLoading || tierLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <Skeleton className="h-14 w-full" />
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  const { upcoming, live, completed } = groupCompetitions(competitions);
  const hasAny = upcoming.length + live.length + completed.length > 0;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <CompetitionHeader title="Competitions" avatarUrl={profile?.avatar_url} displayName={profile?.display_name} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground tracking-tight uppercase">Competitions</h2>
          {canCreate && (
            <Button onClick={() => navigate("/competition/create")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
              <Plus className="h-4 w-4 mr-1" /> Create
            </Button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          </div>
        )}

        {!hasAny ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No competitions yet.</p>
            {canCreate ? (
              <Button onClick={() => navigate("/competition/create")}
                className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Create Your First Competition
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Upgrade to Affiliate Pro to create competitions.</p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <Section title="🔴 Live" comps={live} navigate={navigate} />
            <Section title="📅 Upcoming" comps={upcoming} navigate={navigate} />
            <Section title="✅ Completed" comps={completed} navigate={navigate} />
          </div>
        )}
      </main>
    </div>
  );
}
