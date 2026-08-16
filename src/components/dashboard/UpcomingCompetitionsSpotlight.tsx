import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, MapPin, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CardRow } from "./CardRow";
import {
  useUpcomingCompetitions,
  POSTER_GRADIENTS,
  POSTER_QUOTES,
} from "./useUpcomingCompetitions";

export function UpcomingCompetitionsSpotlight() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useUpcomingCompetitions(10);

  if (isError) return null;

  const items = data ?? [];

  if (!isLoading && items.length === 0) return null;

  return (
    <CardRow title="On the calendar">
      {isLoading
        ? [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56 w-[220px] shrink-0 rounded-xl" />
          ))
        : items.map((c, idx) => {
            const gradient = POSTER_GRADIENTS[idx % POSTER_GRADIENTS.length];
            const quote = POSTER_QUOTES[idx % POSTER_QUOTES.length];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/competition/${c.id}`)}
                className="snap-start shrink-0 w-[220px] text-left rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 hover:-translate-y-0.5 transition-all"
              >
                <div className="relative h-28 w-full overflow-hidden">
                  {c.poster_url ? (
                    <img
                      src={c.poster_url}
                      alt={c.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className={cn("absolute inset-0 bg-gradient-to-br flex items-center justify-center", gradient)}>
                      <Trophy className="h-20 w-20 text-background/10 absolute -bottom-3 -right-3" />
                      <p className="text-[10px] font-black text-background uppercase whitespace-pre-line text-center leading-tight tracking-wider">
                        {quote}
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <h3 className="text-sm font-bold uppercase text-foreground leading-tight line-clamp-2">
                    {c.name}
                  </h3>
                  {c.date && (
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {format(new Date(c.date), "dd MMM yyyy")}
                    </p>
                  )}
                  {(c.host_gym || c.venue) && (
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.host_gym ?? c.venue}</span>
                    </p>
                  )}
                </div>
              </button>
            );
          })}
    </CardRow>
  );
}
