import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  FORMAT_FIELD_LABELS,
  PROGRAM_WORKOUT_FORMATS,
  SECTION_TYPES,
} from "../types";
import { useCreateWorkout, useMovementHistory, useMovements } from "../hooks";
import { sanitizeError } from "@/lib/validation";

interface DraftExercise {
  key: string;
  movement_name: string;
  sets: string;
  reps: string;
  load: string;
  rest_seconds: string;
  tempo: string;
}

interface DraftSection {
  key: string;
  name: string;
  section_type: string;
  exercises: DraftExercise[];
}

let counter = 0;
const uid = () => `d${Date.now()}_${++counter}`;

const emptyExercise = (): DraftExercise => ({
  key: uid(),
  movement_name: "",
  sets: "",
  reps: "",
  load: "",
  rest_seconds: "",
  tempo: "",
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  programId: string;
  dayId: string;
  dayLabel: string;
}

export function AddWorkoutDialog({ open, onOpenChange, programId, dayId, dayLabel }: Props) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState("standard");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [sections, setSections] = useState<DraftSection[]>([
    { key: uid(), name: "Strength", section_type: "strength", exercises: [emptyExercise()] },
  ]);

  const createWorkout = useCreateWorkout();
  const { data: movements } = useMovements();
  const { data: history } = useMovementHistory();

  const defaultsByMovement = useMemo(() => {
    const m = new Map<string, { load: number | null; reps: number | null }>();
    for (const h of history ?? []) {
      m.set(h.movement_name.toLowerCase(), { load: h.last_load, reps: h.last_reps });
    }
    return m;
  }, [history]);

  const formatDef = PROGRAM_WORKOUT_FORMATS.find((f) => f.key === format);

  const setExercise = (sKey: string, eKey: string, patch: Partial<DraftExercise>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.key !== sKey
          ? s
          : { ...s, exercises: s.exercises.map((e) => (e.key === eKey ? { ...e, ...patch } : e)) },
      ),
    );
  };

  /** Smart defaults: pre-fill load/reps from the athlete's recent history. */
  const pickMovement = (sKey: string, eKey: string, value: string) => {
    const known = defaultsByMovement.get(value.toLowerCase());
    setExercise(sKey, eKey, {
      movement_name: value,
      load: known?.load != null ? String(known.load) : "",
      reps: known?.reps != null ? String(known.reps) : "",
    });
  };

  const submit = async () => {
    if (name.trim().length < 2) {
      toast.error("Give the workout a name");
      return;
    }
    try {
      await createWorkout.mutateAsync({
        programId,
        dayId,
        name: name.trim(),
        workout_format: format,
        format_config: Object.fromEntries(
          Object.entries(config).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)]),
        ),
        sections: sections.map((s) => ({
          name: s.name,
          section_type: s.section_type,
          exercises: s.exercises.map((e) => ({
            movement_name: e.movement_name.trim(),
            movement_id:
              movements?.find((m) => m.name.toLowerCase() === e.movement_name.trim().toLowerCase())?.id ??
              null,
            sets: e.sets ? parseInt(e.sets) : null,
            reps: e.reps ? parseInt(e.reps) : null,
            load: e.load ? parseFloat(e.load) : null,
            rest_seconds: e.rest_seconds ? parseInt(e.rest_seconds) : null,
            tempo: e.tempo || null,
          })),
        })),
      });
      toast.success("Workout added");
      setName("");
      setConfig({});
      setSections([
        { key: uid(), name: "Strength", section_type: "strength", exercises: [emptyExercise()] },
      ]);
      onOpenChange(false);
    } catch (e) {
      toast.error(sanitizeError(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wide">Add workout — {dayLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-name">Workout name</Label>
              <Input id="w-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Upper body strength" />
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => { setFormat(v); setConfig({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAM_WORKOUT_FORMATS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Progressive disclosure: only the fields this format needs */}
          {formatDef && formatDef.fields.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border border-border p-3">
              {formatDef.fields.map((f) => (
                <div key={f} className="space-y-1.5">
                  <Label className="text-xs">{FORMAT_FIELD_LABELS[f] ?? f}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={config[f] ?? ""}
                    onChange={(e) => setConfig((c) => ({ ...c, [f]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          {sections.map((s) => (
            <div key={s.key} className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Select
                  value={s.section_type}
                  onValueChange={(v) =>
                    setSections((prev) =>
                      prev.map((x) =>
                        x.key === s.key
                          ? {
                              ...x,
                              section_type: v,
                              name: SECTION_TYPES.find((t) => t.key === v)?.label ?? x.name,
                            }
                          : x,
                      ),
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map((t) => (
                      <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1" />
                {sections.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setSections((prev) => prev.filter((x) => x.key !== s.key))}
                    aria-label="Remove section"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {s.exercises.map((e) => {
                const known = defaultsByMovement.get(e.movement_name.trim().toLowerCase());
                return (
                  <div key={e.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        list="movement-options"
                        value={e.movement_name}
                        onChange={(ev) => pickMovement(s.key, e.key, ev.target.value)}
                        placeholder="Movement"
                        className="h-9"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 shrink-0"
                        onClick={() =>
                          setSections((prev) =>
                            prev.map((x) =>
                              x.key === s.key
                                ? { ...x, exercises: x.exercises.filter((y) => y.key !== e.key) }
                                : x,
                            ),
                          )
                        }
                        aria-label="Remove exercise"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      <Input className="h-8 text-xs" placeholder="Sets" value={e.sets} onChange={(ev) => setExercise(s.key, e.key, { sets: ev.target.value })} />
                      <Input className="h-8 text-xs" placeholder="Reps" value={e.reps} onChange={(ev) => setExercise(s.key, e.key, { reps: ev.target.value })} />
                      <Input className="h-8 text-xs" placeholder="Load" value={e.load} onChange={(ev) => setExercise(s.key, e.key, { load: ev.target.value })} />
                      <Input className="h-8 text-xs" placeholder="Rest s" value={e.rest_seconds} onChange={(ev) => setExercise(s.key, e.key, { rest_seconds: ev.target.value })} />
                      <Input className="h-8 text-xs" placeholder="Tempo" value={e.tempo} onChange={(ev) => setExercise(s.key, e.key, { tempo: ev.target.value })} />
                    </div>
                    {known?.load != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        Pre-filled from your last session
                      </Badge>
                    )}
                  </div>
                );
              })}

              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() =>
                  setSections((prev) =>
                    prev.map((x) =>
                      x.key === s.key ? { ...x, exercises: [...x.exercises, emptyExercise()] } : x,
                    ),
                  )
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Exercise
              </Button>
            </div>
          ))}

          <datalist id="movement-options">
            {(movements ?? []).map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() =>
                setSections((prev) => [
                  ...prev,
                  { key: uid(), name: "Conditioning", section_type: "conditioning", exercises: [emptyExercise()] },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Section
            </Button>
            <div className="flex-1" />
            <Button size="sm" onClick={submit} disabled={createWorkout.isPending} className="uppercase text-xs font-semibold">
              {createWorkout.isPending ? "Saving…" : "Save workout"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
