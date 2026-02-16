import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Plus, Calendar, MapPin, ChevronRight } from "lucide-react";

interface Competition {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  type: string | null;
  status: string;
  created_at: string;
}

export default function CompetitionList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error: fetchError } = await supabase
        .from("competitions")
        .select("id, name, date, venue, type, status, created_at")
        .order("created_at", { ascending: false });

      if (fetchError) setError(fetchError.message);
      else setCompetitions((data as Competition[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-14 w-full" />
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CompetitionHeader
        title="Competitions"
        subscriptionTier={profile?.subscription_tier}
        avatarUrl={profile?.avatar_url}
        displayName={profile?.display_name}
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground tracking-tight uppercase">
            Competitions
          </h2>
          <Button
            onClick={() => navigate("/competition/create")}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {competitions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No competitions yet.</p>
            <Button
              onClick={() => navigate("/competition/create")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Create Your First Competition
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {competitions.map((comp) => (
              <button
                key={comp.id}
                onClick={() => navigate(`/competition/${comp.id}`)}
                className="w-full text-left p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground">{comp.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {comp.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(comp.date).toLocaleDateString()}
                        </span>
                      )}
                      {comp.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {comp.venue}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                        {comp.status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
