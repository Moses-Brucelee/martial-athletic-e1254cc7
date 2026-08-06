import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Flame,
  Play,
  Search,
  Timer,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { ProgramCard } from "@/modules/programs/components/ProgramCard";
import { CreateProgramDialog } from "@/modules/programs/components/CreateProgramDialog";
import {
  useAuthoredPrograms,
  useEnrollments,
  useMovementHistory,
  useOpenSession,
  useProgramLibrary,
  useRecentSessions,
  useStartSession,
} from "@/modules/programs/hooks";
import { PROGRAM_CATEGORIES } from "@/modules/programs/types";
import { sanitizeError } from "@/lib/validation";

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Programs() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const { data: enrollments, isLoading: loadingEnroll } = useEnrollments();
  const { data: authored } = useAuthoredPrograms();
  const { data: library, isLoading: loadingLibrary } = useProgramLibrary(category, search);
  const { data: sessions, isLoading: loadingSessions } = useRecentSessions(10);
  const { data: openSession } = useOpenSession();
  const { data: history } = useMovementHistory();
  const startSession = useStartSession();

  const assigned = useMemo(
    () => (enrollments ?? []).filter((e) => e.source === "coach"),
    [enrollments],
  );
  const mine = useMemo(
    () => (enrollments ?? []).filter((e) => e.source !== "coach"),
    [enrollments],
  );

  const completed = (sessions ?? []).filter((s) => s.status === "completed");
  const totalMinutes = Math.round(
    completed.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / 60,
  );
  const thisWeek = completed.filter((s) => {
    const d = new Date(s.finished_at ?? s.created_at);
    return Date.now() - d.getTime() < 7 * 24 * 3600 * 1000;
  }).length;

  const personalBests = useMemo(
    () =>
      (history ?? [])
        .filter((h) => h.best_load != null)
        .sort((a, b) => (b.best_load ?? 0) - (a.best_load ?? 0))
        .slice(0, 5),
    [history],
  );

  const quickStart = async () => {
    try {
      const s = await startSession.mutateAsync({ title: "Free workout" });
      navigate(`/programs/session/${s.id}`);
    } catch (e) {
      toast.error(sanitizeError(e));
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-20">
      <SEO
        title="Training Programs | Martial Athletic"
        description="Follow structured training programs, run guided workouts with smart timers, and track your progress and personal bests."
        path="/programs"
      />
      <AppHeader title="Programs" />

      <main className="px-4 sm:px-6 py-5 space-y-7 max-w-5xl mx-auto">
        {/* Today's workout */}
        <Section title="Today's Workout">
          {openSession ? (
            <div className="rounded-xl border border-primary/50 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">{openSession.title}</span>
                <Badge variant="secondary" className="text-[10px] uppercase">In progress</Badge>
              </div>
              <Button
                className="w-full uppercase text-xs font-semibold"
                onClick={() => navigate(`/programs/session/${openSession.id}`)}
              >
                <Play className="h-4 w-4 mr-1.5" /> Resume workout
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {mine.length + assigned.length > 0
                  ? "Pick up where you left off in one of your programs, or start a free workout."
                  : "Join a program below, or start a free workout and log it straight to your history."}
              </p>
              <div className="flex gap-2">
                {(mine[0] ?? assigned[0]) && (
                  <Button
                    size="sm"
                    className="uppercase text-xs font-semibold"
                    onClick={() => navigate(`/programs/${(mine[0] ?? assigned[0]).program_id}`)}
                  >
                    Open program
                  </Button>
                )}
                <Button size="sm" variant="outline" className="uppercase text-xs font-semibold" onClick={quickStart}>
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Free workout
                </Button>
              </div>
            </div>
          )}
        </Section>

        {/* Progress summary */}
        <Section title="Progress Summary">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Activity, label: "Sessions", value: completed.length },
              { icon: Flame, label: "This week", value: thisWeek },
              { icon: Timer, label: "Minutes", value: totalMinutes },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <m.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                <div className="text-lg font-bold text-foreground tabular-nums">{m.value}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Personal bests */}
        {personalBests.length > 0 && (
          <Section title="Personal Best Highlights">
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {personalBests.map((pb) => (
                <div key={pb.movement_name} className="flex items-center gap-3 px-4 py-2.5">
                  <Trophy className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">{pb.movement_name}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {pb.best_load} {pb.load_unit ?? "kg"}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* My + assigned programs */}
        <Tabs defaultValue="mine">
          <TabsList className="w-full">
            <TabsTrigger value="mine" className="flex-1 text-xs uppercase">My Programs</TabsTrigger>
            <TabsTrigger value="assigned" className="flex-1 text-xs uppercase">Assigned</TabsTrigger>
            <TabsTrigger value="coaching" className="flex-1 text-xs uppercase">Coaching</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="mt-3 space-y-3">
            {loadingEnroll ? (
              <Skeleton className="h-24 w-full" />
            ) : mine.length === 0 ? (
              <p className="text-xs text-muted-foreground">You haven't joined a program yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {mine.map((e) => e.program && <ProgramCard key={e.id} program={e.program} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assigned" className="mt-3 space-y-3">
            {assigned.length === 0 ? (
              <p className="text-xs text-muted-foreground">No coach-assigned programs.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {assigned.map((e) => e.program && <ProgramCard key={e.id} program={e.program} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="coaching" className="mt-3 space-y-3">
            <div className="flex justify-end">
              <CreateProgramDialog />
            </div>
            {(authored ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">You haven't built any programs yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {(authored ?? []).map((p) => <ProgramCard key={p.id} program={p} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Library */}
        <Section title="Program Library">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search programs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[{ key: "all", label: "All" }, ...PROGRAM_CATEGORIES].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                    category === c.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {loadingLibrary ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (library ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No published programs in this category yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {(library ?? []).map((p) => <ProgramCard key={p.id} program={p} />)}
              </div>
            )}
          </div>
        </Section>

        {/* History */}
        <Section title="Workout History">
          {loadingSessions ? (
            <Skeleton className="h-20 w-full" />
          ) : (sessions ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No workouts logged yet.</p>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {(sessions ?? []).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => navigate(`/programs/session/${s.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40"
                >
                  <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">{s.title}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(s.finished_at ?? s.created_at).toLocaleDateString()}
                      {s.duration_seconds ? ` · ${Math.round(s.duration_seconds / 60)} min` : ""}
                    </div>
                  </div>
                  <Badge
                    variant={s.status === "completed" ? "secondary" : "outline"}
                    className="text-[10px] uppercase shrink-0"
                  >
                    {s.status.replace("_", " ")}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </Section>
      </main>
    </div>
  );
}
