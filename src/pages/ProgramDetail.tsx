import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Play, Plus, Trash2, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { useSuperUserAccess } from "@/hooks/useSuperUserAccess";
import { AddWorkoutDialog } from "@/modules/programs/components/AddWorkoutDialog";
import {
  useDeleteProgram,
  useDeleteWorkout,
  useEnroll,
  useEnrollments,
  useProgramRoster,
  useProgramSessions,
  useProgramTree,
  useStartSession,
  useUpdateProgram,
} from "@/modules/programs/hooks";
import { deriveTimer } from "@/modules/programs/timer";
import { PROGRAM_CATEGORIES } from "@/modules/programs/types";
import { sanitizeError } from "@/lib/validation";

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperUser } = useSuperUserAccess();
  const { data: program, isLoading } = useProgramTree(id);
  const { data: enrollments } = useEnrollments();
  const enroll = useEnroll();
  const startSession = useStartSession();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();
  const deleteWorkout = useDeleteWorkout();
  const [addFor, setAddFor] = useState<{ dayId: string; label: string } | null>(null);

  const isOwner = !!user && program?.created_by === user.id;
  const canManage = isOwner || isSuperUser;
  const enrollment = useMemo(
    () => (enrollments ?? []).find((e) => e.program_id === id) ?? null,
    [enrollments, id],
  );

  const { data: roster } = useProgramRoster(canManage ? id : undefined);
  const { data: programSessions } = useProgramSessions(canManage ? id : undefined);

  const sessionsByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of programSessions ?? []) {
      if (s.status !== "completed") continue;
      m.set(s.user_id, (m.get(s.user_id) ?? 0) + 1);
    }
    return m;
  }, [programSessions]);

  const begin = async (workoutId: string, title: string) => {
    try {
      const s = await startSession.mutateAsync({
        title,
        programId: id,
        workoutId,
        enrollmentId: enrollment?.id ?? null,
      });
      navigate(`/programs/session/${s.id}`);
    } catch (e) {
      toast.error(sanitizeError(e));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader title="Program" backTo="/programs" />
        <div className="p-4 space-y-3 max-w-4xl mx-auto">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader title="Program" backTo="/programs" />
        <div className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">This program isn't available.</p>
          <Button variant="outline" onClick={() => navigate("/programs")}>Back to programs</Button>
        </div>
      </div>
    );
  }

  const category = PROGRAM_CATEGORIES.find((c) => c.key === program.category)?.label ?? program.category;

  return (
    <div className="min-h-dvh bg-background pb-20">
      <AppHeader title={program.title} backTo="/programs" />

      <main className="px-4 sm:px-6 py-5 space-y-6 max-w-4xl mx-auto">
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground">{program.title}</h1>
              {program.description && (
                <p className="text-xs text-muted-foreground">{program.description}</p>
              )}
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase shrink-0">{category}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>{program.weeks_count} weeks</span>
            <span>·</span>
            <span>{program.days_per_week} days / week</span>
            <span>·</span>
            <span className="uppercase">{program.level}</span>
            {program.status !== "published" && (
              <Badge variant="outline" className="text-[10px] uppercase">{program.status}</Badge>
            )}
          </div>
          {!enrollment && !isOwner && (
            <Button
              className="w-full uppercase text-xs font-semibold"
              onClick={async () => {
                try {
                  await enroll.mutateAsync(program.id);
                  toast.success("Joined program");
                } catch (e) {
                  toast.error(sanitizeError(e));
                }
              }}
              disabled={enroll.isPending}
            >
              Join program
            </Button>
          )}
        </section>

        <Tabs defaultValue="plan">
          <TabsList className="w-full">
            <TabsTrigger value="plan" className="flex-1 text-xs uppercase">Plan</TabsTrigger>
            {canManage && (
              <TabsTrigger value="athletes" className="flex-1 text-xs uppercase">Athletes</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="plan" className="mt-3">
            <Accordion type="single" collapsible className="space-y-2">
              {program.weeks.map((week) => (
                <AccordionItem
                  key={week.id}
                  value={week.id}
                  className="rounded-xl border border-border bg-card px-3"
                >
                  <AccordionTrigger className="text-sm font-bold uppercase tracking-wide">
                    Week {week.week_number}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-3">
                    {week.days.map((day) => (
                      <div key={day.id} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            {day.name ?? `Day ${day.day_number}`}
                          </span>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px]"
                              onClick={() =>
                                setAddFor({
                                  dayId: day.id,
                                  label: `Week ${week.week_number} · Day ${day.day_number}`,
                                })
                              }
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Workout
                            </Button>
                          )}
                        </div>

                        {day.workouts.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">Rest / no workout planned.</p>
                        ) : (
                          day.workouts.map((w) => {
                            const spec = deriveTimer(w.workout_format, w.format_config);
                            return (
                              <div key={w.id} className="rounded-lg bg-muted/40 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground flex-1 truncate">
                                    {w.name}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] uppercase">{spec.label}</Badge>
                                </div>
                                <ul className="space-y-1">
                                  {w.sections.map((s) => (
                                    <li key={s.id} className="text-[11px] text-muted-foreground">
                                      <span className="font-semibold uppercase tracking-wide">{s.name}</span>
                                      {": "}
                                      {s.exercises.map((e) => e.movement_name).join(", ") || "—"}
                                    </li>
                                  ))}
                                </ul>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="uppercase text-[11px] font-semibold"
                                    onClick={() => begin(w.id, w.name)}
                                    disabled={startSession.isPending}
                                  >
                                    <Play className="h-3.5 w-3.5 mr-1" /> Start
                                  </Button>
                                  {canManage && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-[11px]"
                                      onClick={async () => {
                                        try {
                                          await deleteWorkout.mutateAsync(w.id);
                                          toast.success("Workout removed");
                                        } catch (e) {
                                          toast.error(sanitizeError(e));
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          {canManage && (
            <TabsContent value="athletes" className="mt-3 space-y-4">
              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Enrolled athletes ({(roster ?? []).length})
                  </span>
                </div>
                {(roster ?? []).length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">No athletes enrolled yet.</p>
                ) : (
                  (roster ?? []).map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs text-foreground flex-1 truncate">{r.user_id}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {sessionsByUser.get(r.user_id) ?? 0} completed
                      </Badge>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Program settings
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs uppercase"
                    onClick={async () => {
                      try {
                        await updateProgram.mutateAsync({
                          id: program.id,
                          updates: {
                            status: program.status === "published" ? "draft" : "published",
                            is_public: program.status !== "published",
                          },
                        });
                        toast.success(program.status === "published" ? "Unpublished" : "Published");
                      } catch (e) {
                        toast.error(sanitizeError(e));
                      }
                    }}
                  >
                    {program.status === "published" ? "Unpublish" : "Publish to library"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs uppercase"
                    onClick={async () => {
                      if (!window.confirm("Delete this program and all its content?")) return;
                      try {
                        await deleteProgram.mutateAsync(program.id);
                        toast.success("Program deleted");
                        navigate("/programs");
                      } catch (e) {
                        toast.error(sanitizeError(e));
                      }
                    }}
                  >
                    Delete program
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {addFor && (
        <AddWorkoutDialog
          open={!!addFor}
          onOpenChange={(v) => !v && setAddFor(null)}
          programId={program.id}
          dayId={addFor.dayId}
          dayLabel={addFor.label}
        />
      )}
    </div>
  );
}
