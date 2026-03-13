import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Dumbbell, Users, Trophy, ArrowUp, ArrowDown } from "lucide-react";

// ── Division presets ──────────────────────────────────────────────────

const DIVISION_PRESETS = [
  { label: "RX Male", name: "RX Male" },
  { label: "RX Female", name: "RX Female" },
  { label: "Scaled Male", name: "Scaled Male" },
  { label: "Scaled Female", name: "Scaled Female" },
  { label: "Masters 35+", name: "Masters 35+" },
  { label: "Teens 14-17", name: "Teens 14-17" },
];

// ── Types ─────────────────────────────────────────────────────────────

export interface QuickWorkout {
  id: string;
  name: string;
  description: string;
}

export interface QuickConfigState {
  divisions: string[];
  workouts: QuickWorkout[];
  rankingDirection: "desc" | "asc";
  maxTeams: number | null;
  waitlistEnabled: boolean;
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyQuickWorkout(): QuickWorkout {
  return { id: createId(), name: "", description: "" };
}

export function defaultQuickConfig(): QuickConfigState {
  return {
    divisions: [],
    workouts: [emptyQuickWorkout()],
    rankingDirection: "desc",
    maxTeams: null,
    waitlistEnabled: true,
  };
}

// ── Component ─────────────────────────────────────────────────────────

interface StepQuickConfigProps {
  config: QuickConfigState;
  setConfig: React.Dispatch<React.SetStateAction<QuickConfigState>>;
  disabled?: boolean;
}

export function StepQuickConfig({ config, setConfig, disabled }: StepQuickConfigProps) {
  const [customDivision, setCustomDivision] = useState("");

  const toggleDivision = (name: string) => {
    setConfig((prev) => ({
      ...prev,
      divisions: prev.divisions.includes(name)
        ? prev.divisions.filter((d) => d !== name)
        : [...prev.divisions, name],
    }));
  };

  const addCustomDivision = () => {
    const trimmed = customDivision.trim();
    if (!trimmed || config.divisions.includes(trimmed)) return;
    setConfig((prev) => ({ ...prev, divisions: [...prev.divisions, trimmed] }));
    setCustomDivision("");
  };

  const updateWorkout = (id: string, field: keyof QuickWorkout, value: string) => {
    setConfig((prev) => ({
      ...prev,
      workouts: prev.workouts.map((w) => (w.id === id ? { ...w, [field]: value } : w)),
    }));
  };

  const addWorkout = () => {
    setConfig((prev) => ({ ...prev, workouts: [...prev.workouts, emptyQuickWorkout()] }));
  };

  const removeWorkout = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      workouts: prev.workouts.length > 1 ? prev.workouts.filter((w) => w.id !== id) : prev.workouts,
    }));
  };

  return (
    <div className="space-y-6">
      {/* ── Divisions ────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Divisions</h3>
        </div>
        <p className="text-xs text-muted-foreground">Select preset divisions or add your own.</p>

        <div className="flex flex-wrap gap-2">
          {DIVISION_PRESETS.map((preset) => {
            const isSelected = config.divisions.includes(preset.name);
            return (
              <button
                key={preset.name}
                type="button"
                disabled={disabled}
                onClick={() => toggleDivision(preset.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40"
                } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom divisions */}
        {config.divisions.filter((d) => !DIVISION_PRESETS.some((p) => p.name === d)).map((d) => (
          <Badge key={d} variant="secondary" className="mr-1">
            {d}
            <button
              type="button"
              onClick={() => toggleDivision(d)}
              className="ml-1 text-muted-foreground hover:text-destructive"
            >
              ×
            </button>
          </Badge>
        ))}

        <div className="flex gap-2">
          <Input
            value={customDivision}
            onChange={(e) => setCustomDivision(e.target.value)}
            placeholder="Custom division…"
            className="h-9 bg-background text-sm flex-1"
            disabled={disabled}
            maxLength={50}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomDivision())}
          />
          <Button type="button" size="sm" variant="outline" onClick={addCustomDivision} disabled={disabled || !customDivision.trim()} className="h-9">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Workouts ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Workouts</h3>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addWorkout} disabled={disabled} className="h-8 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add Workout
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Name each workout and describe it. Judges will enter <strong>points directly</strong> per team per workout.
        </p>

        <div className="space-y-4">
          {config.workouts.map((w, i) => (
            <div key={w.id} className="bg-background border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Workout {i + 1}</span>
                {config.workouts.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeWorkout(w.id)} disabled={disabled}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <Input
                value={w.name}
                onChange={(e) => updateWorkout(w.id, "name", e.target.value)}
                placeholder={`e.g. WOD ${i + 1} — Fran`}
                className="h-9 bg-card text-sm"
                disabled={disabled}
                maxLength={100}
              />
              <Textarea
                value={w.description}
                onChange={(e) => updateWorkout(w.id, "description", e.target.value)}
                placeholder="Workout description — movements, reps, time cap…"
                className="bg-card min-h-[60px] text-sm"
                disabled={disabled}
                maxLength={500}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Leaderboard Ranking ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Leaderboard Ranking</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["desc", "asc"] as const).map((dir) => {
            const isSelected = config.rankingDirection === dir;
            const Icon = dir === "desc" ? ArrowDown : ArrowUp;
            return (
              <button
                key={dir}
                type="button"
                disabled={disabled}
                onClick={() => setConfig((prev) => ({ ...prev, rankingDirection: dir }))}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-muted-foreground/30"
                } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
              >
                <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <div className="text-left">
                  <p className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {dir === "desc" ? "Highest Points Wins" : "Lowest Points Wins"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dir === "desc" ? "Standard — most points on top" : "Golf-style — fewest points on top"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Capacity ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Capacity</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground font-medium text-sm">Max Teams</Label>
            <Input
              type="number"
              min={1}
              value={config.maxTeams ?? ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, maxTeams: e.target.value ? parseInt(e.target.value) : null }))}
              placeholder="Unlimited"
              className="h-9 bg-background text-sm"
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Waitlist</p>
              <p className="text-xs text-muted-foreground">Auto-promote when spots open</p>
            </div>
            <Switch
              checked={config.waitlistEnabled}
              onCheckedChange={(v) => setConfig((prev) => ({ ...prev, waitlistEnabled: v }))}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
