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
    <CardRow index="01" title="On the calendar" note="Events open for entry or already running">
      {isLoading
        ? [1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              className={cn("shrink-0 rounded-none", i === 1 ? "h-64 w-[300px]" : "h-56 w-[210px]")}
            />
          ))
        : items.map((c, idx) => {
            const gradient = POSTER_GRADIENTS[idx % POSTER_GRADIENTS.length];
            const quote = POSTER_QUOTES[idx % POSTER_QUOTES.length];
            // First card runs wider so the row doesn't read as a machine-stamped grid.
            const lead = idx === 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/competition/${c.id}`)}
                className={cn(
                  "snap-start shrink-0 text-left overflow-hidden border border-border bg-card hover:border-primary transition-all group",
                  lead ? "w-[280px] sm:w-[320px]" : "w-[200px] sm:w-[220px]"
                )}
              >
                <div className={cn("relative w-full overflow-hidden", lead ? "h-40" : "h-28")}>
                  {c.poster_url ? (
                    <img
                      src={c.poster_url}
                      alt={c.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className={cn("absolute inset-0 bg-gradient-to-br flex items-center justify-center", gradient)}>
                      <Trophy className="h-20 w-20 text-background/10 absolute -bottom-3 -right-3" />
                      <p className="text-[10px] font-bold text-background uppercase whitespace-pre-line text-center leading-tight tracking-wider">
                        {quote}
                      </p>
                    </div>
                  )}
                  <span className="absolute top-0 left-0 bg-background/85 backdrop-blur-sm text-[10px] font-bold tabular-nums text-primary px-2 py-1 tracking-widest">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className={cn("space-y-1.5", lead ? "p-4" : "p-3")}>
                  <h3
                    className={cn(
                      "font-bold uppercase text-foreground leading-tight line-clamp-2",
                      lead ? "text-base" : "text-sm"
                    )}
                  >
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
