import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { SEO } from "@/components/SEO";
import { ArrowLeft, Trophy, Dumbbell, Shirt, Package, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

interface CompetitionRow {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  host_gym: string | null;
  type: string | null;
}

interface ProgramRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  duration_weeks: number | null;
}

function formatDate(value: string | null) {
  if (!value) return "Date to be announced";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date to be announced";
  return format(parsed, "d MMM yyyy");
}

export default function Browse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const backPath = user ? "/dashboard" : "/";
  const today = new Date().toISOString().split("T")[0];

  const competitionsQuery = useQuery({
    queryKey: ["browse-competitions", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, name, date, venue, host_gym, type")
        .neq("status", "draft")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(9);
      if (error) throw error;
      return (data ?? []) as CompetitionRow[];
    },
  });

  const programsQuery = useQuery({
    queryKey: ["browse-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, title, description, category, level, duration_weeks")
        .eq("status", "published")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as ProgramRow[];
    },
  });

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SEO
        title="Marketplace — Competitions & Training Programs | Martial Athletic"
        description="Browse upcoming fitness competitions and public training programs on Martial Athletic. Find an event near you, view details, and register online."
        path="/browse"
      />
      <header className="flex items-center gap-3 px-4 sm:px-8 py-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(backPath)}
          aria-label={user ? "Back to dashboard" : "Back to homepage"}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <img src={logoCompact} alt="Martial Athletic" className="w-8 h-8 object-contain" />
        <span className="text-sm font-bold text-foreground tracking-tight uppercase">Marketplace</span>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-10">
        <section className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground uppercase tracking-tight">
            Marketplace
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Everything you can join or train with on Martial Athletic: upcoming competitions open for
            registration and public training programs built by coaches. Apparel and equipment listings
            are on the way.
          </p>
        </section>

        {/* Competitions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              Upcoming competitions
            </h2>
          </div>

          {competitionsQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : competitionsQuery.isError ? (
            <p className="text-sm text-muted-foreground">
              Competitions could not be loaded right now.{" "}
              <button
                type="button"
                className="underline text-foreground"
                onClick={() => competitionsQuery.refetch()}
              >
                Try again
              </button>
            </p>
          ) : (competitionsQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No competitions are open for registration at the moment. New events are published by host
              gyms regularly — check back soon.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {competitionsQuery.data!.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/event/${c.id}`)}
                  className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors space-y-2"
                >
                  <span className="block text-sm font-bold text-foreground uppercase tracking-wide">
                    {c.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {formatDate(c.date)}
                  </span>
                  {c.venue && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {c.venue}
                    </span>
                  )}
                  {c.type && (
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {c.type}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Programs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              Training programs
            </h2>
          </div>

          {programsQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (programsQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No public programs have been published yet. Coaches can build and publish structured
              multi-week programs from the Programs area.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {programsQuery.data!.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/programs/${p.id}`)}
                  className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors space-y-2"
                >
                  <span className="block text-sm font-bold text-foreground uppercase tracking-wide">
                    {p.title}
                  </span>
                  {p.description && (
                    <span className="block text-xs text-muted-foreground line-clamp-2">
                      {p.description}
                    </span>
                  )}
                  <span className="flex flex-wrap gap-1.5">
                    {p.level && (
                      <Badge variant="outline" className="text-[10px] uppercase">{p.level}</Badge>
                    )}
                    {p.duration_weeks && (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {p.duration_weeks} weeks
                      </Badge>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => navigate("/programs")}>
            View all programs
          </Button>
        </section>

        {/* Coming soon */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
            Coming soon
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <span className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wide">
                <Shirt className="h-4 w-4 text-primary" /> Apparel
              </span>
              <p className="text-xs text-muted-foreground">
                Event and gym apparel sold directly by host affiliates, with sizing collected at
                registration.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <span className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wide">
                <Package className="h-4 w-4 text-primary" /> Equipment
              </span>
              <p className="text-xs text-muted-foreground">
                Training equipment listings from partner suppliers, filtered by discipline and gym
                setup.
              </p>
            </div>
          </div>
        </section>

        <div className="pt-2">
          <Button variant="outline" onClick={() => navigate(backPath)}>
            {user ? "Back to Main Menu" : "Back to Home"}
          </Button>
        </div>
      </main>
    </div>
  );
}
