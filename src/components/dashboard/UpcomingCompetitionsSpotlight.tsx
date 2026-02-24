import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trophy, MapPin, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface Competition {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  host_gym: string | null;
}

export function UpcomingCompetitionsSpotlight() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const { data: competitions, isLoading, isError } = useQuery({
    queryKey: ["upcoming-competitions-spotlight"],
    queryFn: async () => {
      // Try upcoming first
      const { data: upcoming, error: upErr } = await supabase
        .from("competitions")
        .select("id, name, date, venue, host_gym")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5);

      if (upErr) throw upErr;
      if (upcoming && upcoming.length > 0) return upcoming as Competition[];

      // Fallback to most recent
      const { data: recent, error: reErr } = await supabase
        .from("competitions")
        .select("id, name, date, venue, host_gym")
        .order("date", { ascending: false })
        .limit(5);

      if (reErr) throw reErr;
      return (recent ?? []) as Competition[];
    },
  });

  if (isError) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
        Upcoming Competitions
      </h2>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : competitions && competitions.length > 0 ? (
        <div className="space-y-2">
          {competitions.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group cursor-pointer"
              onClick={() => navigate(`/competition/${c.id}`)}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{c.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {c.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(c.date), "MMM d, yyyy")}
                    </span>
                  )}
                  {(c.venue || c.host_gym) && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" />
                      {c.venue || c.host_gym}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">
          No competitions yet. Create your first one!
        </p>
      )}
    </section>
  );
}
