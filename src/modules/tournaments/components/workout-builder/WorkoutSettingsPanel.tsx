import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import type { LocalWorkout } from "./types";
import { WORKOUT_FORMATS, SCORING_DEFAULTS, needsTimeCap } from "./types";

interface Props {
  workout: LocalWorkout;
  workoutIndex: number;
  onUpdate: (field: keyof LocalWorkout, value: string) => void;
  disabled?: boolean;
}

const SCORING_TYPES = [
  { value: "reps", label: "Reps" },
  { value: "time", label: "Time" },
  { value: "load", label: "Load (Weight)" },
  { value: "points", label: "Points" },
];

export function WorkoutSettingsPanel({ workout, workoutIndex, onUpdate, disabled }: Props) {
  const handleFormatChange = (value: string) => {
    onUpdate("workout_type", value);
    if (SCORING_DEFAULTS[value]) {
      onUpdate("scoring_type", SCORING_DEFAULTS[value]);
    }
  };

  const selectedFormat = WORKOUT_FORMATS.find((f) => f.value === workout.workout_type);
  const timeCap = parseInt(workout.time_cap_seconds) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Workout Settings</h3>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">Workout Name</Label>
        <Input
          value={workout.name}
          onChange={(e) => onUpdate("name", e.target.value)}
          placeholder={`Workout ${workoutIndex + 1}`}
          className="h-10 sm:h-9 bg-background text-sm"
          disabled={disabled}
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">Format</Label>
        <Select value={workout.workout_type} onValueChange={handleFormatChange} disabled={disabled}>
          <SelectTrigger className="h-10 sm:h-9 bg-background text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKOUT_FORMATS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                <span className="font-medium">{f.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedFormat && (
          <p className="text-[11px] text-muted-foreground">{selectedFormat.desc}</p>
        )}
      </div>

      {needsTimeCap(workout.workout_type) && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">Time Cap (seconds)</Label>
          <Input
            type="number"
            value={workout.time_cap_seconds}
            onChange={(e) => onUpdate("time_cap_seconds", e.target.value)}
            placeholder="e.g. 720"
            className="h-10 sm:h-9 bg-background text-sm"
            disabled={disabled}
            min={0}
          />
          {timeCap > 0 && (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold text-foreground">
              {Math.floor(timeCap / 60)}:{(timeCap % 60).toString().padStart(2, "0")} min
            </span>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">Scoring Type</Label>
        <Select value={workout.scoring_type} onValueChange={(v) => onUpdate("scoring_type", v)} disabled={disabled}>
          <SelectTrigger className="h-10 sm:h-9 bg-background text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCORING_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">Description</Label>
        <Textarea
          value={workout.description}
          onChange={(e) => onUpdate("description", e.target.value)}
          placeholder="Workout rules and special instructions..."
          className="bg-background text-sm min-h-[80px] resize-y"
          disabled={disabled}
          maxLength={2000}
        />
      </div>
    </div>
  );
}
