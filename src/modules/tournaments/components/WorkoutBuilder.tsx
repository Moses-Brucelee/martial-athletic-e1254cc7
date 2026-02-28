import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronUp, ChevronDown, Dumbbell } from "lucide-react";

const WORKOUT_TYPES = [
  { value: "amrap", label: "AMRAP" },
  { value: "for_time", label: "For Time" },
  { value: "max_load", label: "Max Load" },
  { value: "rounds", label: "Rounds" },
  { value: "custom", label: "Custom" },
];

const SCORING_TYPES = [
  { value: "reps", label: "Reps" },
  { value: "time", label: "Time" },
  { value: "load", label: "Load" },
  { value: "points", label: "Points" },
];

const SCORING_DEFAULTS: Record<string, string> = {
  amrap: "reps",
  for_time: "time",
  max_load: "load",
  rounds: "reps",
  custom: "points",
};

export interface LocalMovement {
  movement_name: string;
  reps: string;
  weight: string;
  unit: string;
}

export interface LocalWorkout {
  name: string;
  workout_type: string;
  time_cap_seconds: string;
  scoring_type: string;
  movements: LocalMovement[];
}

function emptyMovement(): LocalMovement {
  return { movement_name: "", reps: "", weight: "", unit: "kg" };
}

export function emptyWorkout(): LocalWorkout {
  return {
    name: "",
    workout_type: "amrap",
    time_cap_seconds: "",
    scoring_type: "reps",
    movements: [emptyMovement()],
  };
}

interface WorkoutBuilderProps {
  workouts: LocalWorkout[];
  setWorkouts: React.Dispatch<React.SetStateAction<LocalWorkout[]>>;
  disabled?: boolean;
}

export function WorkoutBuilder({ workouts, setWorkouts, disabled }: WorkoutBuilderProps) {
  const updateWorkout = (index: number, field: keyof LocalWorkout, value: string) => {
    setWorkouts((prev) => {
      const updated = [...prev];
      const w = { ...updated[index], [field]: value };
      // Auto-suggest scoring type when workout type changes
      if (field === "workout_type" && SCORING_DEFAULTS[value]) {
        w.scoring_type = SCORING_DEFAULTS[value];
      }
      updated[index] = w;
      return updated;
    });
  };

  const addWorkout = () => setWorkouts((prev) => [...prev, emptyWorkout()]);

  const removeWorkout = (index: number) => {
    if (workouts.length <= 1) return;
    setWorkouts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMovement = (wi: number, mi: number, field: keyof LocalMovement, value: string) => {
    setWorkouts((prev) => {
      const updated = [...prev];
      const movements = [...updated[wi].movements];
      movements[mi] = { ...movements[mi], [field]: value };
      updated[wi] = { ...updated[wi], movements };
      return updated;
    });
  };

  const addMovement = (wi: number) => {
    setWorkouts((prev) => {
      const updated = [...prev];
      updated[wi] = { ...updated[wi], movements: [...updated[wi].movements, emptyMovement()] };
      return updated;
    });
  };

  const removeMovement = (wi: number, mi: number) => {
    setWorkouts((prev) => {
      const updated = [...prev];
      if (updated[wi].movements.length <= 1) return prev;
      updated[wi] = { ...updated[wi], movements: updated[wi].movements.filter((_, i) => i !== mi) };
      return updated;
    });
  };

  const moveMovement = (wi: number, mi: number, direction: -1 | 1) => {
    setWorkouts((prev) => {
      const updated = [...prev];
      const movements = [...updated[wi].movements];
      const newIndex = mi + direction;
      if (newIndex < 0 || newIndex >= movements.length) return prev;
      [movements[mi], movements[newIndex]] = [movements[newIndex], movements[mi]];
      updated[wi] = { ...updated[wi], movements };
      return updated;
    });
  };

  const showTimeCap = (type: string) => type === "amrap" || type === "for_time";

  return (
    <div className="space-y-6">
      {workouts.map((workout, wi) => (
        <div key={wi} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <h4 className="font-bold text-foreground uppercase text-sm">Workout #{wi + 1}</h4>
            </div>
            {workouts.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeWorkout(wi)} disabled={disabled}
                className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs font-medium">Workout Name</Label>
              <Input value={workout.name} onChange={(e) => updateWorkout(wi, "name", e.target.value)}
                placeholder="e.g. Fran, Hero WOD" className="h-9 bg-background text-sm" disabled={disabled} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs font-medium">Workout Type</Label>
              <Select value={workout.workout_type} onValueChange={(v) => updateWorkout(wi, "workout_type", v)} disabled={disabled}>
                <SelectTrigger className="h-9 bg-background text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showTimeCap(workout.workout_type) && (
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs font-medium">Time Cap (seconds)</Label>
                <Input type="number" value={workout.time_cap_seconds}
                  onChange={(e) => updateWorkout(wi, "time_cap_seconds", e.target.value)}
                  placeholder="e.g. 600" className="h-9 bg-background text-sm" disabled={disabled} min={0} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs font-medium">Scoring Type</Label>
              <Select value={workout.scoring_type} onValueChange={(v) => updateWorkout(wi, "scoring_type", v)} disabled={disabled}>
                <SelectTrigger className="h-9 bg-background text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCORING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Movements */}
          <div className="space-y-2">
            <Label className="text-foreground text-xs font-bold uppercase">Movements</Label>
            {workout.movements.map((m, mi) => (
              <div key={mi} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                <span className="text-xs text-muted-foreground w-5 text-center">{mi + 1}</span>
                <Input value={m.movement_name} onChange={(e) => updateMovement(wi, mi, "movement_name", e.target.value)}
                  placeholder="Movement" className="h-8 flex-1 text-xs bg-background" disabled={disabled} maxLength={100} />
                <Input type="number" value={m.reps} onChange={(e) => updateMovement(wi, mi, "reps", e.target.value)}
                  placeholder="Reps" className="h-8 w-16 text-xs bg-background text-center" disabled={disabled} min={0} />
                <Input type="number" value={m.weight} onChange={(e) => updateMovement(wi, mi, "weight", e.target.value)}
                  placeholder="Wt" className="h-8 w-16 text-xs bg-background text-center" disabled={disabled} />
                <Select value={m.unit} onValueChange={(v) => updateMovement(wi, mi, "unit", v)} disabled={disabled}>
                  <SelectTrigger className="h-8 w-16 text-xs bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-col gap-0.5">
                  <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveMovement(wi, mi, -1)}
                    disabled={disabled || mi === 0}><ChevronUp className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveMovement(wi, mi, 1)}
                    disabled={disabled || mi === workout.movements.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                </div>
                {workout.movements.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMovement(wi, mi)} disabled={disabled}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addMovement(wi)} disabled={disabled}
              className="w-full border-dashed text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Movement
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addWorkout} disabled={disabled}
        className="w-full border-dashed border-accent text-accent hover:bg-accent/10">
        <Plus className="h-4 w-4 mr-2" /> Add Workout
      </Button>
    </div>
  );
}
