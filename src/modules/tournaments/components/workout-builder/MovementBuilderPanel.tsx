import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Copy } from "lucide-react";
import type { LocalMovement, LocalWorkout } from "./types";
import { MOVEMENT_LIBRARY, emptyMovement, generateMovementId } from "./types";

interface Props {
  workout: LocalWorkout;
  workoutIndex: number;
  onSetWorkouts: React.Dispatch<React.SetStateAction<LocalWorkout[]>>;
  disabled?: boolean;
}

export function MovementBuilderPanel({ workout, workoutIndex: wi, onSetWorkouts, disabled }: Props) {
  const updateMovement = useCallback((mi: number, field: keyof LocalMovement, value: string) => {
    onSetWorkouts((prev) => {
      const updated = [...prev];
      const movements = [...updated[wi].movements];
      movements[mi] = { ...movements[mi], [field]: value };
      updated[wi] = { ...updated[wi], movements };
      return updated;
    });
  }, [wi, onSetWorkouts]);

  const addMovement = () => {
    onSetWorkouts((prev) => {
      const updated = [...prev];
      updated[wi] = { ...updated[wi], movements: [...updated[wi].movements, emptyMovement()] };
      return updated;
    });
  };

  const removeMovement = (mi: number) => {
    onSetWorkouts((prev) => {
      const updated = [...prev];
      if (updated[wi].movements.length <= 1) return prev;
      updated[wi] = { ...updated[wi], movements: updated[wi].movements.filter((_, i) => i !== mi) };
      return updated;
    });
  };

  const duplicateMovement = (mi: number) => {
    onSetWorkouts((prev) => {
      const updated = [...prev];
      const movements = [...updated[wi].movements];
      const dup = { ...movements[mi], id: generateMovementId() };
      movements.splice(mi + 1, 0, dup);
      updated[wi] = { ...updated[wi], movements };
      return updated;
    });
  };

  const moveMovement = (mi: number, direction: -1 | 1) => {
    onSetWorkouts((prev) => {
      const updated = [...prev];
      const movements = [...updated[wi].movements];
      const newIdx = mi + direction;
      if (newIdx < 0 || newIdx >= movements.length) return prev;
      [movements[mi], movements[newIdx]] = [movements[newIdx], movements[mi]];
      updated[wi] = { ...updated[wi], movements };
      return updated;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Movements</h3>
        <span className="text-[11px] text-muted-foreground">{workout.movements.length} movement{workout.movements.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-2">
        {workout.movements.map((m, mi) => (
          <div
            key={m.id}
            className="group rounded-lg border border-border bg-card p-3 space-y-2 hover:border-primary/30 transition-colors"
          >
            {/* Row 1: Movement name + controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
                onPointerDown={(e) => {
                  // Simple drag via reorder buttons for now
                  e.preventDefault();
                }}
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-primary w-5 text-center">{mi + 1}</span>

              <Select
                value={MOVEMENT_LIBRARY.includes(m.movement_name) ? m.movement_name : "__custom"}
                onValueChange={(v) => {
                  if (v !== "__custom") updateMovement(mi, "movement_name", v);
                }}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 flex-1 text-xs bg-background">
                  <SelectValue placeholder="Select movement" />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  {MOVEMENT_LIBRARY.map((name) => (
                    <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                  ))}
                  <SelectItem value="__custom" className="text-xs italic text-muted-foreground">Custom…</SelectItem>
                </SelectContent>
              </Select>

              {(!MOVEMENT_LIBRARY.includes(m.movement_name) || m.movement_name === "") && (
                <Input
                  value={m.movement_name}
                  onChange={(e) => updateMovement(mi, "movement_name", e.target.value)}
                  placeholder="Custom movement"
                  className="h-8 flex-1 text-xs bg-background"
                  disabled={disabled}
                  maxLength={100}
                />
              )}

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveMovement(mi, -1)}
                  disabled={disabled || mi === 0} title="Move up">
                  <span className="text-[10px]">↑</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveMovement(mi, 1)}
                  disabled={disabled || mi === workout.movements.length - 1} title="Move down">
                  <span className="text-[10px]">↓</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={() => duplicateMovement(mi)} disabled={disabled} title="Duplicate">
                  <Copy className="h-3 w-3" />
                </Button>
                {workout.movements.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMovement(mi)} disabled={disabled} title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Row 2: Parameters */}
            <div className="flex items-center gap-2 pl-11">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase">Reps</span>
                <Input type="number" value={m.reps} onChange={(e) => updateMovement(mi, "reps", e.target.value)}
                  placeholder="–" className="h-7 w-14 text-xs bg-background text-center" disabled={disabled} min={0} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase">Weight</span>
                <Input type="number" value={m.weight} onChange={(e) => updateMovement(mi, "weight", e.target.value)}
                  placeholder="–" className="h-7 w-14 text-xs bg-background text-center" disabled={disabled} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase">Unit</span>
                <Select value={m.unit} onValueChange={(v) => updateMovement(mi, "unit", v)} disabled={disabled}>
                  <SelectTrigger className="h-7 w-14 text-[10px] bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="cal">cal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase">Dist</span>
                <Input type="number" value={m.distance} onChange={(e) => updateMovement(mi, "distance", e.target.value)}
                  placeholder="–" className="h-7 w-14 text-xs bg-background text-center" disabled={disabled} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase">Cal</span>
                <Input type="number" value={m.calories} onChange={(e) => updateMovement(mi, "calories", e.target.value)}
                  placeholder="–" className="h-7 w-14 text-xs bg-background text-center" disabled={disabled} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground uppercase">Height</span>
                <Input type="number" value={m.height} onChange={(e) => updateMovement(mi, "height", e.target.value)}
                  placeholder="–" className="h-7 w-14 text-xs bg-background text-center" disabled={disabled} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addMovement} disabled={disabled}
        className="w-full border-dashed text-xs h-9">
        <Plus className="h-3 w-3 mr-1" /> Add Movement
      </Button>
    </div>
  );
}
