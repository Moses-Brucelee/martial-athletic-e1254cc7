import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Trophy, ArrowUp, ArrowDown } from "lucide-react";

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

export interface QuickConfigState {
  divisions: string[];
  rankingDirection: "desc" | "asc";
  maxTeams: number | null;
  waitlistEnabled: boolean;
}

export function defaultQuickConfig(): QuickConfigState {
  return {
    divisions: [],
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

  return (
    <div className="space-y-6">
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

      {/* ── Info note ────────────────────────────────────────── */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">💡 Workouts can be added after creation</strong> — you'll set up workouts on the dashboard where you can save drafts, preview, and edit anytime.
        </p>
      </div>
    </div>
  );
}
