import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Dumbbell, FileDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkoutSettingsPanel } from "./WorkoutSettingsPanel";
import { MovementBuilderPanel } from "./MovementBuilderPanel";
import { WorkoutPreviewPanel } from "./WorkoutPreviewPanel";
import type { LocalWorkout } from "./types";
import { emptyWorkout, WORKOUT_TEMPLATES, SCORING_DEFAULTS, generateMovementId } from "./types";

interface WorkoutBuilderProProps {
  workouts: LocalWorkout[];
  setWorkouts: React.Dispatch<React.SetStateAction<LocalWorkout[]>>;
  disabled?: boolean;
}

export function WorkoutBuilderPro({ workouts, setWorkouts, disabled }: WorkoutBuilderProProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const workout = workouts[activeIndex] || workouts[0];

  const updateWorkoutField = (field: keyof LocalWorkout, value: string) => {
    setWorkouts((prev) => {
      const updated = [...prev];
      const w = { ...updated[activeIndex], [field]: value };
      if (field === "workout_type" && SCORING_DEFAULTS[value]) {
        w.scoring_type = SCORING_DEFAULTS[value];
      }
      updated[activeIndex] = w;
      return updated;
    });
  };

  const addWorkout = () => {
    setWorkouts((prev) => [...prev, emptyWorkout()]);
    setActiveIndex(workouts.length);
  };

  const removeWorkout = (index: number) => {
    if (workouts.length <= 1) return;
    setWorkouts((prev) => prev.filter((_, i) => i !== index));
    if (activeIndex >= workouts.length - 1) {
      setActiveIndex(Math.max(0, workouts.length - 2));
    }
  };

  const importTemplate = (templateName: string) => {
    const template = WORKOUT_TEMPLATES.find((t) => t.name === templateName);
    if (!template) return;
    setWorkouts((prev) => {
      const updated = [...prev];
      updated[activeIndex] = {
        name: template.name,
        description: "",
        workout_type: template.workout_type,
        time_cap_seconds: template.time_cap,
        scoring_type: SCORING_DEFAULTS[template.workout_type] || "reps",
        movements: template.movements.map((m) => ({ ...m, id: generateMovementId() })),
      };
      return updated;
    });
  };

  return (
    <div className="space-y-4">
      {/* Workout Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {workouts.map((w, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${i === activeIndex
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-foreground hover:border-primary/30"
              }
            `}
          >
            <Dumbbell className="h-3 w-3" />
            {w.name || `Workout ${i + 1}`}
            {workouts.length > 1 && i === activeIndex && (
              <button
                onClick={(e) => { e.stopPropagation(); removeWorkout(i); }}
                className="ml-1 hover:text-destructive"
                disabled={disabled}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={addWorkout} disabled={disabled}
          className="h-7 text-xs border-dashed">
          <Plus className="h-3 w-3 mr-1" /> Add Workout
        </Button>
      </div>

      {/* Template import */}
      <div className="flex items-center gap-2">
        <FileDown className="h-4 w-4 text-muted-foreground" />
        <Select onValueChange={importTemplate} disabled={disabled}>
          <SelectTrigger className="h-8 w-[200px] text-xs bg-background">
            <SelectValue placeholder="Import template..." />
          </SelectTrigger>
          <SelectContent>
            {WORKOUT_TEMPLATES.map((t) => (
              <SelectItem key={t.name} value={t.name} className="text-xs">{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Settings */}
        <div className="lg:col-span-3 bg-card border border-border rounded-xl p-4">
          <WorkoutSettingsPanel
            workout={workout}
            workoutIndex={activeIndex}
            onUpdate={updateWorkoutField}
            disabled={disabled}
          />
        </div>

        {/* Center: Movement Builder */}
        <div className="lg:col-span-5 bg-card border border-border rounded-xl p-4">
          <MovementBuilderPanel
            workout={workout}
            workoutIndex={activeIndex}
            onSetWorkouts={setWorkouts}
            disabled={disabled}
          />
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4">
          <WorkoutPreviewPanel
            workout={workout}
            workoutIndex={activeIndex}
          />
        </div>
      </div>
    </div>
  );
}
