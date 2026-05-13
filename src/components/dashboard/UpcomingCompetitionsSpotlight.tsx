import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, MapPin, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

interface Competition {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  host_gym: string | null;
  type: string | null;
  divisions: string | null;
  poster_url: string | null;
}

// Rotating motivational banners for poster area
const POSTER_GRADIENTS = [
  "from-primary/90 to-primary/40",
  "from-emerald-600/80 to-emerald-900/60",
  "from-amber-500/80 to-orange-700/60",
  "from-violet-600/80 to-indigo-900/60",
  "from-sky-500/80 to-blue-800/60",
];

const POSTER_QUOTES = [
  "COMPETE.\nCONQUER.\nREPEAT.",
  "TRAIN\nHARDER\nTHAN YESTERDAY.",
  "STRENGTH\nHAS NO\nLIMIT.",
  "PUSH\nBEYOND\nYOUR BEST.",
  "RISE.\nGRIND.\nSHINE.",
];

export function UpcomingCompetitionsSpotlight() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const { data: competitions, isLoading, isError } = useQuery({
    queryKey: ["upcoming-competitions-spotlight"],
    queryFn: async () => {
      const { data: upcoming, error: upErr } = await supabase
        .from("competitions")
        .select("id, name, date, venue, host_gym, type, divisions")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5);

      if (upErr) throw upErr;
      if (upcoming && upcoming.length > 0) return upcoming as Competition[];

      const { data: recent, error: reErr } = await supabase
        .from("competitions")
        .select("id, name, date, venue, host_gym, type, divisions")
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
        Upcoming Competitions Spotlight
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : competitions && competitions.length > 0 ? (
        <div className="space-y-3">
          {competitions.map((c, idx) => {
            const gradient = POSTER_GRADIENTS[idx % POSTER_GRADIENTS.length];
            const quote = POSTER_QUOTES[idx % POSTER_QUOTES.length];

            // Build date range string
            let dateStr = "";
            if (c.date) {
              dateStr = format(new Date(c.date), "dd MMM yyyy");
            }

            return (
              <div
                key={c.id}
                className="flex rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => navigate(`/competition/${c.id}`)}
              >
                {/* Poster / Banner area */}
                <div
                  className={`w-28 sm:w-36 shrink-0 bg-gradient-to-br ${gradient} flex items-center justify-center p-3 relative overflow-hidden`}
                >
                  <div className="absolute inset-0 opacity-10">
                    <Trophy className="h-32 w-32 text-background absolute -bottom-4 -right-4" />
                  </div>
                  <p className="text-[10px] sm:text-xs font-black text-background uppercase leading-tight text-center whitespace-pre-line tracking-wider z-10">
                    {quote}
                  </p>
                </div>

                {/* Details area */}
                <div className="flex-1 p-3 sm:p-4 min-w-0 flex flex-col justify-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-black text-foreground uppercase leading-tight truncate">
                    {c.name}
                  </h3>

                  {dateStr && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="font-semibold">{dateStr}</span>
                    </div>
                  )}

                  {c.type && (
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium truncate">
                      {c.type}
                      {c.divisions ? ` · ${c.divisions}` : ""}
                    </p>
                  )}

                  {(c.venue || c.host_gym) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {c.host_gym ? `Team - ${c.host_gym}` : ""}
                        {c.host_gym && c.venue ? ", " : ""}
                        {c.venue ?? ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No competitions yet. Create your first one!
          </p>
        </div>
      )}
    </section>
  );
}
