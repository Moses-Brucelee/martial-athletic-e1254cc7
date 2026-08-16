import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronRight, Flag, SkipForward, Timer as TimerIcon } from "lucide-react";
import { toast } from "sonner";
import { WorkoutTimer } from "@/modules/programs/components/WorkoutTimer";
import {
  useFinishSession,
  useLogResult,
  useMovementHistory,
  useSessionDetail,
} from "@/modules/programs/hooks";
import { deriveExerciseTimer, deriveTimer, restTimer } from "@/modules/programs/timer";
import type { SectionExercise } from "@/modules/programs/types";
import { sanitizeError } from "@/lib/validation";

interface Step {
  exercise: SectionExercise;
  sectionName: string;
  setNumber: number;
  totalSets: number;
}

export default function WorkoutSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useSessionDetail(id);
  const { data: history } = useMovementHistory();
  const logResult = useLogResult(id);
  const finishSession = useFinishSession();

  const [index, setIndex] = useState(0);
  const [reps, setReps] = useState("");
  const [load, setLoad] = useState("");
  const [startedAt] = useState(() => Date.now());
  const [resting, setResting] = useState<number | null>(null);

  const steps: Step[] = useMemo(() => {
    const out: Step[] = [];
    for (const section of data?.workout?.sections ?? []) {
      for (const exercise of section.exercises) {
        const totalSets = Math.max(1, exercise.sets ?? 1);
        for (let s = 1; s <= totalSets; s++) {
          out.push({ exercise, sectionName: section.name, setNumber: s, totalSets });
        }
      }
    }
    return out;
  }, [data?.workout]);

  const current = steps[index] ?? null;
  const done = data?.session.status === "completed";

  // Smart defaults: template value → athlete's recent history → blank.
  useEffect(() => {
    if (!current) return;
    const known = (history ?? []).find(
      (h) => h.movement_name.toLowerCase() === current.exercise.movement_name.toLowerCase(),
    );
    setReps(
      current.exercise.reps != null
        ? String(current.exercise.reps)
        : known?.last_reps != null
          ? String(known.last_reps)
          : "",
    );
    setLoad(
      current.exercise.load != null
        ? String(current.exercise.load)
        : known?.last_load != null
          ? String(known.last_load)
          : "",
    );
    setResting(null);
  }, [index, current?.exercise.id, history]);

  const advance = () => {
    if (index + 1 >= steps.length) return;
    setIndex((i) => i + 1);
  };

  const completeSet = async (skipped = false) => {
    if (!current || !id) return;
    try {
      await logResult.mutateAsync({
        exerciseId: current.exercise.id,
        movementName: current.exercise.movement_name,
        setNumber: current.setNumber,
        reps: reps ? parseInt(reps) : null,
        load: load ? parseFloat(load) : null,
        loadUnit: current.exercise.load_unit ?? "kg",
        skipped,
      });
      if (!skipped && current.exercise.rest_seconds) {
        setResting(current.exercise.rest_seconds);
      }
      advance();
    } catch (e) {
      toast.error(sanitizeError(e));
    }
  };

  const skipExercise = () => {
    if (!current) return;
    let next = index;
    while (next < steps.length && steps[next].exercise.id === current.exercise.id) next++;
    setIndex(Math.min(next, Math.max(0, steps.length - 1)));
  };

  const finish = async () => {
    if (!id) return;
    try {
      await finishSession.mutateAsync({
        id,
        duration: Math.round((Date.now() - startedAt) / 1000),
      });
      toast.success("Workout logged");
      navigate("/programs");
    } catch (e) {
      toast.error(sanitizeError(e));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader title="Workout" backTo="/programs" />
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-dvh bg-background">
        <AppHeader title="Workout" backTo="/programs" />
        <div className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">This session isn't available.</p>
          <Button variant="outline" onClick={() => navigate("/programs")}>Back to programs</Button>
        </div>
      </div>
    );
  }

  const workoutSpec = deriveTimer(
    data.workout?.workout_format ?? "standard",
    data.workout?.format_config,
  );
  const exerciseSpec = current ? deriveExerciseTimer(current.exercise) : null;
  const progress = steps.length ? Math.round((index / steps.length) * 100) : 0;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <AppHeader title={data.session.title} backTo="/programs" />

      <main className="px-4 sm:px-6 py-5 space-y-5 max-w-2xl mx-auto">
        <WorkoutTimer spec={workoutSpec} autoStart={!done} />

        {steps.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase tracking-wide">
              <span>Progress</span>
              <span>
                {Math.min(index + 1, steps.length)} / {steps.length}
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {done ? (
          <div className="rounded-xl border border-border bg-card p-4 text-center space-y-2">
            <Check className="h-6 w-6 text-primary mx-auto" />
            <p className="text-sm font-bold text-foreground">Session completed</p>
            <p className="text-xs text-muted-foreground">
              {data.results.length} sets logged
              {data.session.duration_seconds
                ? ` · ${Math.round(data.session.duration_seconds / 60)} min`
                : ""}
            </p>
          </div>
        ) : current ? (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase">{current.sectionName}</Badge>
              <Badge variant="outline" className="text-[10px]">
                Set {current.setNumber}/{current.totalSets}
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-foreground">{current.exercise.movement_name}</h2>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {current.exercise.tempo && <span>Tempo {current.exercise.tempo}</span>}
              {current.exercise.rest_seconds && <span>Rest {current.exercise.rest_seconds}s</span>}
              {current.exercise.notes && <span>{current.exercise.notes}</span>}
            </div>

            {exerciseSpec && <WorkoutTimer spec={exerciseSpec} compact />}
            {resting != null && <WorkoutTimer spec={restTimer(resting)} autoStart compact />}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reps" className="text-xs">Reps</Label>
                <Input id="reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="load" className="text-xs">
                  Load ({current.exercise.load_unit ?? "kg"})
                </Label>
                <Input id="load" inputMode="decimal" value={load} onChange={(e) => setLoad(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1 uppercase text-xs font-semibold"
                onClick={() => completeSet(false)}
                disabled={logResult.isPending}
              >
                <Check className="h-4 w-4 mr-1.5" /> Complete set
              </Button>
              <Button variant="outline" className="uppercase text-xs font-semibold" onClick={skipExercise}>
                <SkipForward className="h-4 w-4 mr-1.5" /> Skip exercise
              </Button>
              {index + 1 < steps.length && (
                <Button variant="ghost" className="uppercase text-xs font-semibold" onClick={advance}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-center">
            <TimerIcon className="h-5 w-5 text-primary mx-auto" />
            <p className="text-sm text-foreground">Free workout. Run the timer and finish when you're done.</p>
          </div>
        )}

        {data.results.length > 0 && (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {data.results.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                <span className="flex-1 truncate text-foreground">{r.movement_name}</span>
                <span className="text-muted-foreground tabular-nums">
                  Set {r.set_number}
                  {r.reps != null ? ` · ${r.reps} reps` : ""}
                  {r.load != null ? ` · ${r.load}${r.load_unit ?? "kg"}` : ""}
                  {r.skipped ? " · skipped" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {!done && (
          <Button
            variant="secondary"
            className="w-full uppercase text-xs font-semibold"
            onClick={finish}
            disabled={finishSession.isPending}
          >
            <Flag className="h-4 w-4 mr-1.5" /> Finish workout
          </Button>
        )}
      </main>
    </div>
  );
}
