import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Dumbbell,
  Clock,
  Repeat,
  Weight,
  Timer,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

export interface QuickWorkout {
  id: string;
  name: string;
  workout_type: string;
  time_cap_minutes: number | null;
  scoring_type: string;
  description: string;
}

const WORKOUT_TYPES = [
  { key: "amrap", label: "AMRAP", icon: Repeat, desc: "As Many Reps/Rounds As Possible" },
  { key: "for_time", label: "For Time", icon: Timer, desc: "Complete as fast as possible" },
  { key: "max_load", label: "Max Load", icon: Weight, desc: "Heaviest weight lifted" },
  { key: "emom", label: "EMOM", icon: Clock, desc: "Every Minute On the Minute" },
  { key: "chipper", label: "Chipper", icon: Zap, desc: "Sequential movement list" },
] as const;

const SCORING_TYPES = [
  { key: "reps", label: "Reps", desc: "Highest reps wins", direction: "desc" },
  { key: "time", label: "Time", desc: "Lowest time wins", direction: "asc" },
  { key: "load", label: "Load / Weight", desc: "Heaviest weight wins", direction: "desc" },
  { key: "max_time", label: "Max Time", desc: "Longest duration wins", direction: "desc" },
  { key: "points", label: "Points", desc: "Highest points wins", direction: "desc" },
] as const;

// Auto-suggest scoring type based on workout type
const DEFAULT_SCORING: Record<string, string> = {
  amrap: "reps",
  for_time: "time",
  max_load: "load",
  emom: "reps",
  chipper: "time",
};

// Templates for fast creation
const WORKOUT_TEMPLATES = [
  { name: "AMRAP 12 min", workout_type: "amrap", time_cap_minutes: 12, scoring_type: "reps", description: "12 min AMRAP\n10 Box Jumps\n10 Wall Balls\n10 Burpees" },
  { name: "For Time — Sprint", workout_type: "for_time", time_cap_minutes: 15, scoring_type: "time", description: "21-15-9\nThrusters (95/65)\nPull-ups" },
  { name: "1RM Clean & Jerk", workout_type: "max_load", time_cap_minutes: 10, scoring_type: "load", description: "Find your 1 Rep Max Clean & Jerk\n10 min time cap" },
  { name: "EMOM 10", workout_type: "emom", time_cap_minutes: 10, scoring_type: "reps", description: "10 min EMOM\nOdd: 12 Cal Row\nEven: 8 DB Snatch" },
  { name: "Chipper", workout_type: "chipper", time_cap_minutes: 20, scoring_type: "time", description: "50 Wall Balls\n40 Cal Row\n30 Box Jumps\n20 Clean & Jerks\n10 Muscle-ups" },
];

let _idCounter = 0;
function newId() {
  return `qw_${Date.now()}_${++_idCounter}`;
}

export function emptyQuickWorkout(): QuickWorkout {
  return {
    id: newId(),
    name: "",
    workout_type: "amrap",
    time_cap_minutes: null,
    scoring_type: "reps",
    description: "",
  };
}

// ── Component ─────────────────────────────────────────────────────────

interface StepQuickWorkoutsProps {
  workouts: QuickWorkout[];
  setWorkouts: React.Dispatch<React.SetStateAction<QuickWorkout[]>>;
  disabled?: boolean;
}

export function StepQuickWorkouts({ workouts, setWorkouts, disabled }: StepQuickWorkoutsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(workouts[0]?.id ?? null);

  const addWorkout = () => {
    const w = emptyQuickWorkout();
    setWorkouts((prev) => [...prev, w]);
    setExpandedId(w.id);
  };

  const removeWorkout = (id: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateWorkout = (id: string, patch: Partial<QuickWorkout>) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w))
    );
  };

  const applyTemplate = (tpl: typeof WORKOUT_TEMPLATES[number]) => {
    const w: QuickWorkout = {
      id: newId(),
      name: tpl.name,
      workout_type: tpl.workout_type,
      time_cap_minutes: tpl.time_cap_minutes,
      scoring_type: tpl.scoring_type,
      description: tpl.description,
    };
    setWorkouts((prev) => [...prev, w]);
    setExpandedId(w.id);
  };

  const handleTypeChange = (id: string, type: string) => {
    const suggestedScoring = DEFAULT_SCORING[type] || "points";
    updateWorkout(id, { workout_type: type, scoring_type: suggestedScoring });
  };

  return (
    <div className="space-y-6">
      {/* Templates quick-add */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Copy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Quick Templates</h3>
        </div>
        <p className="text-xs text-muted-foreground">Tap a template to add it instantly — edit after.</p>
        <div className="flex flex-wrap gap-2">
          {WORKOUT_TEMPLATES.map((tpl) => {
            const TypeIcon = WORKOUT_TYPES.find((t) => t.key === tpl.workout_type)?.icon || Dumbbell;
            return (
              <button
                key={tpl.name}
                type="button"
                disabled={disabled}
                onClick={() => applyTemplate(tpl)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-medium text-foreground disabled:opacity-50"
              >
                <TypeIcon className="h-3.5 w-3.5 text-primary" />
                {tpl.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workout list */}
      <div className="space-y-3">
        {workouts.map((workout, idx) => {
          const isExpanded = expandedId === workout.id;
          const scoringInfo = SCORING_TYPES.find((s) => s.key === workout.scoring_type);
          const typeInfo = WORKOUT_TYPES.find((t) => t.key === workout.workout_type);

          return (
            <div
              key={workout.id}
              className="bg-card border border-border rounded-xl overflow-hidden transition-all"
            >
              {/* Collapsed header */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : workout.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{idx + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {workout.name || `Workout ${idx + 1}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {typeInfo && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {typeInfo.label}
                        </Badge>
                      )}
                      {scoringInfo && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Score: {scoringInfo.label}
                        </Badge>
                      )}
                      {workout.time_cap_minutes && (
                        <span className="text-[10px] text-muted-foreground">
                          {workout.time_cap_minutes} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {workouts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWorkout(workout.id);
                      }}
                      disabled={disabled}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4 bg-background/50">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Workout Name</Label>
                    <Input
                      value={workout.name}
                      onChange={(e) => updateWorkout(workout.id, { name: e.target.value })}
                      placeholder={`Workout ${idx + 1}`}
                      className="h-9 bg-background text-sm"
                      disabled={disabled}
                      maxLength={80}
                    />
                  </div>

                  {/* Workout Type */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground">Workout Type</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {WORKOUT_TYPES.map((t) => {
                        const isSelected = workout.workout_type === t.key;
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleTypeChange(workout.id, t.key)}
                            className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all text-center ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-muted-foreground hover:border-primary/30"
                            } ${disabled ? "opacity-50" : "cursor-pointer"}`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="text-[10px] font-semibold leading-tight">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Cap + Scoring Type row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">Time Cap (min)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={workout.time_cap_minutes ?? ""}
                        onChange={(e) =>
                          updateWorkout(workout.id, {
                            time_cap_minutes: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="No cap"
                        className="h-9 bg-background text-sm"
                        disabled={disabled}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">Scoring Type *</Label>
                      <Select
                        value={workout.scoring_type}
                        onValueChange={(v) => updateWorkout(workout.id, { scoring_type: v })}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-9 bg-background text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCORING_TYPES.map((s) => (
                            <SelectItem key={s.key} value={s.key}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{s.label}</span>
                                <span className="text-muted-foreground text-[10px]">— {s.desc}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Scoring info callout */}
                  {scoringInfo && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Judges enter:</span>{" "}
                        {scoringInfo.key === "time"
                          ? "finish time → lowest time ranks first"
                          : scoringInfo.key === "reps"
                          ? "total reps → highest reps ranks first"
                          : scoringInfo.key === "load"
                          ? "weight lifted → heaviest ranks first"
                          : scoringInfo.key === "max_time"
                          ? "hold duration → longest time ranks first"
                          : "final points → highest points ranks first"}
                      </p>
                    </div>
                  )}

                  {/* Description / Movements */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">
                      Movements / Description
                    </Label>
                    <Textarea
                      value={workout.description}
                      onChange={(e) => updateWorkout(workout.id, { description: e.target.value })}
                      placeholder={"e.g.\n21-15-9\nThrusters (95/65 lb)\nPull-ups"}
                      className="bg-background text-sm min-h-[80px] font-mono text-xs"
                      disabled={disabled}
                      maxLength={1000}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Plain text — keep it simple. Athletes will see this on their screen.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add workout button */}
      <Button
        type="button"
        variant="outline"
        onClick={addWorkout}
        disabled={disabled}
        className="w-full border-dashed border-accent text-accent hover:bg-accent/10"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Workout
      </Button>

      {workouts.length === 0 && (
        <div className="text-center py-6">
          <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            Add at least one workout using the templates above or the button below.
          </p>
        </div>
      )}
    </div>
  );
}
