import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell, Plus, Trash2, Save, Eye, EyeOff, Clock, Calendar,
  Timer, Repeat, Weight, Trophy, Zap, ArrowUp
} from "lucide-react";
import { toast } from "sonner";
import { useWorkouts } from "@/modules/tournaments/hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface QuickWorkoutsPanelProps {
  competitionId: string;
  isOwner: boolean;
  scoringMode?: "points" | "auto";
}

// ── Scoring type definitions with icons, colors, and contextual fields ──

const SCORING_TYPES = [
  {
    value: "time",
    label: "For Time",
    shortLabel: "Time",
    icon: Timer,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    activeColor: "bg-blue-500 text-white border-blue-500",
    accent: "border-l-blue-500",
    desc: "Athletes complete workout as fast as possible",
    fields: ["time_cap"],
  },
  {
    value: "reps",
    label: "AMRAP",
    shortLabel: "AMRAP",
    icon: Repeat,
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
    activeColor: "bg-orange-500 text-white border-orange-500",
    accent: "border-l-orange-500",
    desc: "Max rounds & reps in a fixed time",
    fields: ["time_cap"],
  },
  {
    value: "load",
    label: "Max Load",
    shortLabel: "Load",
    icon: Weight,
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
    activeColor: "bg-red-500 text-white border-red-500",
    accent: "border-l-red-500",
    desc: "Heaviest weight lifted",
    fields: [],
  },
  {
    value: "max_reps",
    label: "Max Reps",
    shortLabel: "Reps",
    icon: ArrowUp,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    activeColor: "bg-emerald-500 text-white border-emerald-500",
    accent: "border-l-emerald-500",
    desc: "Most reps in a set time or unbroken",
    fields: ["time_cap"],
  },
  {
    value: "points",
    label: "Points",
    shortLabel: "Pts",
    icon: Trophy,
    color: "bg-primary/10 text-primary border-primary/30",
    activeColor: "bg-primary text-primary-foreground border-primary",
    accent: "border-l-primary",
    desc: "Judge awards points manually",
    fields: [],
  },
] as const;

type ScoringTypeValue = (typeof SCORING_TYPES)[number]["value"];

function getScoringConfig(value: string) {
  return SCORING_TYPES.find((s) => s.value === value) || SCORING_TYPES[4]; // default to points
}

function measurementTypeFromScoring(scoring: string): string {
  if (scoring === "time") return "time";
  if (scoring === "load") return "weight";
  if (scoring === "reps" || scoring === "max_reps") return "reps";
  return "points";
}

const VISIBILITY_CONFIG: Record<string, { label: string; icon: typeof Eye; color: string }> = {
  visible: { label: "Visible", icon: Eye, color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
  hidden: { label: "Hidden", icon: EyeOff, color: "bg-destructive/10 text-destructive border-destructive/20" },
  scheduled: { label: "Scheduled", icon: Calendar, color: "bg-primary/10 text-primary border-primary/20" },
};

export function QuickWorkoutsPanel({ competitionId, isOwner, scoringMode = "points" }: QuickWorkoutsPanelProps) {
  const { data: workouts = [], isLoading } = useWorkouts(competitionId);
  const qc = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // New workout form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newScoringType, setNewScoringType] = useState<ScoringTypeValue>("time");
  const [newTimeCap, setNewTimeCap] = useState("");
  const [adding, setAdding] = useState(false);

  const isAutoMode = scoringMode === "auto";
  const activeScoringConfig = getScoringConfig(newScoringType);

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Workout name is required"); return; }
    setAdding(true);
    try {
      const nextNum = workouts.length > 0 ? Math.max(...workouts.map((w) => w.workout_number)) + 1 : 1;
      const scoringType = isAutoMode ? newScoringType : "points";
      const { error } = await supabase.from("competition_workouts").insert({
        competition_id: competitionId,
        workout_number: nextNum,
        name: newName.trim(),
        description: newDesc.trim() || null,
        display_order: nextNum,
        scoring_type: scoringType,
        measurement_type: measurementTypeFromScoring(scoringType),
        workout_type: scoringType === "reps" ? "amrap" : scoringType === "time" ? "for_time" : "custom",
        time_cap_seconds: newTimeCap ? parseInt(newTimeCap) * 60 : null,
        visibility: "hidden",
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      toast.success("Workout added");
      setNewName(""); setNewDesc(""); setNewTimeCap("");
    } catch { toast.error("Failed to add workout"); }
    setAdding(false);
  };

  const handleSaveEdit = async (workoutId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("competition_workouts")
        .update({ name: editName.trim() || null, description: editDesc.trim() || null })
        .eq("id", workoutId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      toast.success("Workout updated");
      setEditingId(null);
    } catch { toast.error("Failed to update workout"); }
    setSaving(false);
  };

  const handleRemove = async (workoutId: string) => {
    try {
      const { error } = await supabase.from("competition_workouts").delete().eq("id", workoutId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      toast.success("Workout removed");
    } catch { toast.error("Failed to remove workout"); }
  };

  const handleScoringTypeChange = async (workoutId: string, scoringType: string) => {
    try {
      const { error } = await supabase
        .from("competition_workouts")
        .update({
          scoring_type: scoringType,
          measurement_type: measurementTypeFromScoring(scoringType),
        })
        .eq("id", workoutId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      toast.success("Scoring type updated");
    } catch { toast.error("Failed to update scoring type"); }
  };

  const handleVisibilityChange = async (workoutId: string, visibility: string) => {
    try {
      const update: any = { visibility };
      if (visibility !== "scheduled") update.scheduled_reveal_at = null;
      const { error } = await supabase
        .from("competition_workouts")
        .update(update)
        .eq("id", workoutId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      toast.success(`Workout ${visibility === "visible" ? "revealed" : visibility === "hidden" ? "hidden" : "scheduled"}`);
    } catch { toast.error("Failed to update visibility"); }
  };

  const handleScheduleReveal = async (workoutId: string, dateTime: string) => {
    try {
      const { error } = await supabase
        .from("competition_workouts")
        .update({ visibility: "scheduled", scheduled_reveal_at: dateTime })
        .eq("id", workoutId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      toast.success("Reveal scheduled");
    } catch { toast.error("Failed to schedule reveal"); }
  };

  const handleRevealAll = async () => {
    try {
      const { error } = await supabase
        .from("competition_workouts")
        .update({ visibility: "visible", scheduled_reveal_at: null })
        .eq("competition_id", competitionId)
        .neq("visibility", "visible");
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      toast.success("All workouts revealed!");
    } catch { toast.error("Failed to reveal workouts"); }
  };

  const startEdit = (w: any) => {
    setEditingId(w.id);
    setEditName(w.name || "");
    setEditDesc(w.description || "");
  };

  const hiddenCount = workouts.filter((w) => (w as any).visibility !== "visible").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Workout list & form */}
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground uppercase">Workouts</h3>
              {hiddenCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  <EyeOff className="h-3 w-3 mr-1" />{hiddenCount} hidden
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isOwner && hiddenCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleRevealAll} className="text-xs h-7">
                  <Eye className="h-3 w-3 mr-1" /> Reveal All
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="lg:hidden text-xs">
                <Eye className="h-3.5 w-3.5 mr-1" />{showPreview ? "Edit" : "Preview"}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : workouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workouts yet. Add your first below.</p>
          ) : (
            <div className="space-y-3">
              {workouts.map((w) => {
                const vis = (w as any).visibility || "visible";
                const visConfig = VISIBILITY_CONFIG[vis] || VISIBILITY_CONFIG.visible;
                const VisIcon = visConfig.icon;
                const revealAt = (w as any).scheduled_reveal_at;
                const wScoringType = (w as any).scoring_type || "points";
                const sc = getScoringConfig(wScoringType);
                const ScIcon = sc.icon;
                const timeCap = (w as any).time_cap_seconds;

                return (
                  <div
                    key={w.id}
                    className={`border-l-4 ${sc.accent} bg-background border border-border rounded-lg p-4 transition-opacity ${vis === "hidden" ? "opacity-60" : ""}`}
                  >
                    {editingId === w.id ? (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Workout {w.workout_number}
                        </span>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Workout name" className="h-9 bg-card text-sm" maxLength={100} />
                        <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description — movements, reps, time cap…" className="bg-card min-h-[60px] text-sm" maxLength={500} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(w.id)} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                            <Save className="h-3.5 w-3.5 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          {/* Type icon block */}
                          <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${sc.color}`}>
                            <ScIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">WOD {w.workout_number}</span>
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${sc.color}`}>
                                {sc.label}
                              </Badge>
                              {timeCap && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" /> {Math.floor(timeCap / 60)}min
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-foreground text-sm mt-0.5">
                              {w.name || `Workout ${w.workout_number}`}
                            </p>
                            {w.description && (
                              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{w.description}</p>
                            )}
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(w)}>
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(w.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Visibility controls */}
                        {isOwner && (
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {/* Scoring type quick-switch (auto mode) */}
                            {isAutoMode && (
                              <div className="flex gap-1">
                                {SCORING_TYPES.map((st) => {
                                  const active = wScoringType === st.value;
                                  const StIcon = st.icon;
                                  return (
                                    <button
                                      key={st.value}
                                      onClick={() => handleScoringTypeChange(w.id, st.value)}
                                      className={`h-6 px-1.5 rounded text-[9px] font-semibold border flex items-center gap-0.5 transition-all ${
                                        active ? st.activeColor : "bg-muted/30 text-muted-foreground border-transparent hover:border-border"
                                      }`}
                                      title={st.label}
                                    >
                                      <StIcon className="h-2.5 w-2.5" />
                                      <span className="hidden sm:inline">{st.shortLabel}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <Badge variant="outline" className={`text-[10px] gap-1 ${visConfig.color}`}>
                              <VisIcon className="h-3 w-3" /> {visConfig.label}
                            </Badge>
                            {vis === "scheduled" && revealAt && (
                              <span className="text-[10px] text-muted-foreground">
                                Reveals {format(new Date(revealAt), "MMM d, HH:mm")}
                              </span>
                            )}
                            <div className="ml-auto flex items-center gap-1">
                              {vis !== "visible" && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-green-700 hover:text-green-800" onClick={() => handleVisibilityChange(w.id, "visible")}>
                                  <Eye className="h-3 w-3 mr-1" /> Reveal
                                </Button>
                              )}
                              {vis !== "hidden" && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive hover:text-destructive/80" onClick={() => handleVisibilityChange(w.id, "hidden")}>
                                  <EyeOff className="h-3 w-3 mr-1" /> Hide
                                </Button>
                              )}
                              {vis !== "scheduled" && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => {
                                  const dt = prompt("Schedule reveal (YYYY-MM-DDTHH:mm):", new Date(Date.now() + 3600000).toISOString().slice(0, 16));
                                  if (dt) handleScheduleReveal(w.id, new Date(dt).toISOString());
                                }}>
                                  <Calendar className="h-3 w-3 mr-1" /> Schedule
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Add workout form ── */}
          {isOwner && (
            <div className="mt-5 bg-background border border-border rounded-xl overflow-hidden">
              {/* Scoring type pill tabs */}
              {isAutoMode && (
                <div className="flex border-b border-border bg-muted/30">
                  {SCORING_TYPES.map((st) => {
                    const active = newScoringType === st.value;
                    const StIcon = st.icon;
                    return (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() => setNewScoringType(st.value as ScoringTypeValue)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-all border-b-2 ${
                          active
                            ? `${st.activeColor} border-current`
                            : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <StIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{st.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="p-4 space-y-3">
                {/* Type hint */}
                {isAutoMode && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${activeScoringConfig.color}`}>
                    <activeScoringConfig.icon className="h-3.5 w-3.5 shrink-0" />
                    <p className="text-[11px] font-medium">{activeScoringConfig.desc}</p>
                  </div>
                )}

                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={`e.g. WOD ${workouts.length + 1} — Fran`}
                  className="h-9 bg-card text-sm"
                  maxLength={100}
                  onKeyDown={(e) => e.key === "Enter" && !adding && handleAdd()}
                />
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Workout description — movements, reps, standards…"
                  className="bg-card min-h-[60px] text-sm"
                  maxLength={500}
                />

                {/* Contextual fields based on scoring type */}
                {isAutoMode && activeScoringConfig.fields.includes("time_cap") && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={newTimeCap}
                      onChange={(e) => setNewTimeCap(e.target.value)}
                      placeholder="Time cap (minutes)"
                      className="h-9 bg-card text-sm flex-1"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                )}

                <div className="flex gap-2 items-center pt-1">
                  <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Plus className="h-3.5 w-3.5 mr-1" /> {adding ? "Adding…" : "Add Workout"}
                  </Button>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <EyeOff className="h-3 w-3" /> Hidden by default
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Live Preview (athlete view) */}
      <div className={`${showPreview ? "block" : "hidden"} lg:block`}>
        <div className="bg-card border border-border rounded-xl p-6 sticky top-4">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground uppercase">Athlete View</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">What athletes see. Hidden workouts excluded.</p>

          {(() => {
            const visibleWorkouts = workouts.filter((w) => {
              const vis = (w as any).visibility || "visible";
              if (vis === "visible") return true;
              if (vis === "scheduled" && (w as any).scheduled_reveal_at) {
                return new Date() >= new Date((w as any).scheduled_reveal_at);
              }
              return false;
            });

            return visibleWorkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No workouts visible to athletes yet.
              </p>
            ) : (
              <div className="space-y-4">
                {visibleWorkouts.map((w) => {
                  const sc = getScoringConfig((w as any).scoring_type || "points");
                  const ScIcon = sc.icon;
                  const timeCap = (w as any).time_cap_seconds;
                  return (
                    <div key={w.id} className={`border-l-4 ${sc.accent} pl-4 py-2`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary uppercase">WOD {w.workout_number}</span>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${sc.color}`}>
                          <ScIcon className="h-2.5 w-2.5 mr-0.5" />{sc.shortLabel}
                        </Badge>
                        {timeCap && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {Math.floor(timeCap / 60)}min
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-foreground text-sm mt-1">{w.name || `Workout ${w.workout_number}`}</h4>
                      {w.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{w.description}</p>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
