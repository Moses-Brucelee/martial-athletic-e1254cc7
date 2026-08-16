import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Dumbbell, Plus, Trash2, Eye, EyeOff, Clock, Calendar,
  Timer, Repeat, Weight, Trophy, ArrowUp, Undo2, Check
} from "lucide-react";
import { toast } from "sonner";
import { useWorkouts } from "@/modules/tournaments/hooks";
import { WorkoutVideo } from "@/components/competition/WorkoutVideo";

import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface QuickWorkoutsPanelProps {
  competitionId: string;
  isOwner: boolean;
  scoringMode?: "points" | "auto";
}

// ── Scoring types ──

const SCORING_TYPES = [
  {
    value: "time",
    label: "For Time",
    shortLabel: "Time",
    icon: Timer,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    activeColor: "bg-blue-500 text-white border-blue-500",
    accent: "border-l-blue-500",
    desc: "Complete as fast as possible",
    hasTimeCap: true,
  },
  {
    value: "reps",
    label: "AMRAP",
    shortLabel: "AMRAP",
    icon: Repeat,
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
    activeColor: "bg-orange-500 text-white border-orange-500",
    accent: "border-l-orange-500",
    desc: "Max rounds & reps in fixed time",
    hasTimeCap: true,
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
    hasTimeCap: false,
  },
  {
    value: "max_reps",
    label: "Max Reps",
    shortLabel: "Reps",
    icon: ArrowUp,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    activeColor: "bg-emerald-500 text-white border-emerald-500",
    accent: "border-l-emerald-500",
    desc: "Most reps completed",
    hasTimeCap: true,
  },
  {
    value: "points",
    label: "Points",
    shortLabel: "Pts",
    icon: Trophy,
    color: "bg-primary/10 text-primary border-primary/30",
    activeColor: "bg-primary text-primary-foreground border-primary",
    accent: "border-l-primary",
    desc: "Judge awards points",
    hasTimeCap: false,
  },
] as const;

type ScoringTypeValue = (typeof SCORING_TYPES)[number]["value"];

function getScoringConfig(value: string) {
  return SCORING_TYPES.find((s) => s.value === value) || SCORING_TYPES[4];
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

// ── Trashed workout for undo ──

interface TrashedWorkout {
  id: string;
  name: string;
  description: string | null;
  workout_number: number;
  scoring_type: string;
  measurement_type: string;
  workout_type: string;
  time_cap_seconds: number | null;
  display_order: number;
  visibility: string;
}

// ── Draft tile state ──

interface DraftTile {
  localId: string;
  name: string;
  description: string;
  videoUrl: string;
  scoringType: ScoringTypeValue;
  timeCap: string;
  saving: boolean;
}

function newDraftTile(): DraftTile {
  return {
    localId: crypto.randomUUID(),
    name: "",
    description: "",
    videoUrl: "",
    scoringType: "time",
    timeCap: "",
    saving: false,
  };
}


// ── Component ──

export function QuickWorkoutsPanel({ competitionId, isOwner, scoringMode = "points" }: QuickWorkoutsPanelProps) {
  const { data: workouts = [], isLoading } = useWorkouts(competitionId);
  const qc = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVideo, setEditVideo] = useState("");
  const [editScoring, setEditScoring] = useState<ScoringTypeValue>("points");
  const [editTimeCap, setEditTimeCap] = useState("");
  const [editNumber, setEditNumber] = useState<number | null>(null);


  const [saving, setSaving] = useState(false);

  // Draft tiles (new workout cards that appear inline)
  const [drafts, setDrafts] = useState<DraftTile[]>([]);

  // Trash with undo
  const [trashed, setTrashed] = useState<TrashedWorkout | null>(null);
  const [trashAnimatingId, setTrashAnimatingId] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAutoMode = scoringMode === "auto";

  // ── Draft tile handlers ──

  const addDraft = () => {
    setDrafts((prev) => [...prev, newDraftTile()]);
  };

  const updateDraft = (localId: string, updates: Partial<DraftTile>) => {
    setDrafts((prev) => prev.map((d) => d.localId === localId ? { ...d, ...updates } : d));
  };

  const discardDraft = (localId: string) => {
    setDrafts((prev) => prev.filter((d) => d.localId !== localId));
  };

  const saveDraft = async (draft: DraftTile) => {
    if (!draft.name.trim()) { toast.error("Workout name is required"); return; }
    updateDraft(draft.localId, { saving: true });
    try {
      const nextNum = workouts.length > 0 ? Math.max(...workouts.map((w) => w.workout_number)) + 1 : 1;
      const scoringType = isAutoMode ? draft.scoringType : "points";
      const { error } = await supabase.from("competition_workouts").insert({
        competition_id: competitionId,
        workout_number: nextNum,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        video_url: draft.videoUrl.trim() || null,

        display_order: nextNum,
        scoring_type: scoringType,
        measurement_type: measurementTypeFromScoring(scoringType),
        workout_type: scoringType === "reps" ? "amrap" : scoringType === "time" ? "for_time" : "custom",
        time_cap_seconds: draft.timeCap ? parseInt(draft.timeCap) * 60 : null,
        visibility: "hidden",
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      discardDraft(draft.localId);
      toast.success("Workout saved");
    } catch {
      toast.error("Failed to save workout");
      updateDraft(draft.localId, { saving: false });
    }
  };

  // ── Existing workout handlers ──

  const handleSaveEdit = async (workoutId: string) => {
    setSaving(true);
    try {
      const update: Record<string, unknown> = {
        name: editName.trim() || null,
        description: editDesc.trim() || null,
        video_url: editVideo.trim() || null,
        time_cap_seconds: editTimeCap ? parseInt(editTimeCap) * 60 : null,
      };
      if (isAutoMode) {
        update.scoring_type = editScoring;
        update.measurement_type = measurementTypeFromScoring(editScoring);
      }
      const { error } = await supabase
        .from("competition_workouts")
        .update(update)
        .eq("id", workoutId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      toast.success("Workout updated");
      setEditingId(null);
    } catch { toast.error("Failed to update"); }
    setSaving(false);
  };


  const handleTrash = useCallback(async (w: any) => {
    // Animate out
    setTrashAnimatingId(w.id);

    // Wait for animation
    await new Promise((r) => setTimeout(r, 400));

    // Store for undo
    const trashedData: TrashedWorkout = {
      id: w.id,
      name: w.name || "",
      description: w.description || null,
      workout_number: w.workout_number,
      scoring_type: (w as any).scoring_type || "points",
      measurement_type: (w as any).measurement_type || "points",
      workout_type: (w as any).workout_type || "custom",
      time_cap_seconds: (w as any).time_cap_seconds || null,
      display_order: (w as any).display_order || w.workout_number,
      visibility: (w as any).visibility || "hidden",
    };

    // Delete from DB
    try {
      const { error } = await supabase.from("competition_workouts").delete().eq("id", w.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      setTrashAnimatingId(null);

      // Set trashed for undo (clear previous timer)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setTrashed(trashedData);
      undoTimerRef.current = setTimeout(() => setTrashed(null), 8000);
    } catch {
      toast.error("Failed to remove");
      setTrashAnimatingId(null);
    }
  }, [competitionId, qc]);

  const handleUndo = async () => {
    if (!trashed) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    try {
      const { error } = await supabase.from("competition_workouts").insert({
        competition_id: competitionId,
        workout_number: trashed.workout_number,
        name: trashed.name,
        description: trashed.description,
        display_order: trashed.display_order,
        scoring_type: trashed.scoring_type,
        measurement_type: trashed.measurement_type,
        workout_type: trashed.workout_type,
        time_cap_seconds: trashed.time_cap_seconds,
        visibility: trashed.visibility,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      toast.success("Workout restored!");
    } catch { toast.error("Failed to restore"); }
    setTrashed(null);
  };

  const handleScoringTypeChange = async (workoutId: string, scoringType: string) => {
    try {
      const { error } = await supabase
        .from("competition_workouts")
        .update({ scoring_type: scoringType, measurement_type: measurementTypeFromScoring(scoringType) })
        .eq("id", workoutId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
    } catch { toast.error("Failed to update scoring type"); }
  };

  const handleVisibilityChange = async (workoutId: string, visibility: string) => {
    try {
      const update: any = { visibility };
      if (visibility !== "scheduled") update.scheduled_reveal_at = null;
      const { error } = await supabase.from("competition_workouts").update(update).eq("id", workoutId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
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
    setEditVideo(w.video_url || "");
    setEditScoring((w.scoring_type || "points") as ScoringTypeValue);
    setEditTimeCap(w.time_cap_seconds ? String(Math.round(w.time_cap_seconds / 60)) : "");
    setEditNumber(w.workout_number ?? null);
  };

  // Cleanup timer
  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); };
  }, []);

  const hiddenCount = workouts.filter((w) => (w as any).visibility !== "visible").length;

  // ── Viewer-only mode: show single Athlete View column (no duplicate edit pane) ──
  if (!isOwner) {
    const visibleWorkouts = workouts.filter((w) => {
      const vis = (w as any).visibility || "visible";
      if (vis === "visible") return true;
      if (vis === "scheduled" && (w as any).scheduled_reveal_at) {
        return new Date() >= new Date((w as any).scheduled_reveal_at);
      }
      return false;
    });

    return (
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground uppercase">Athlete View</h3>
        </div>
        {visibleWorkouts.length === 0 ? (
          <div className="text-center py-10">
            <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No workouts have been disclosed yet. Check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleWorkouts.map((w) => {
              const sc = getScoringConfig((w as any).scoring_type || "points");
              const ScIcon = sc.icon;
              const timeCap = (w as any).time_cap_seconds;
              return (
                <div key={w.id} className={`border-l-4 ${sc.accent} pl-4 py-2 animate-fade-in`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-primary uppercase">WOD {w.workout_number}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${sc.color}`}>
                      <ScIcon className="h-2.5 w-2.5 mr-0.5" />{sc.shortLabel}
                    </Badge>
                    {timeCap && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {Math.floor(timeCap / 60)}min
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-foreground text-sm mt-1">{w.name || `Workout ${w.workout_number}`}</h4>
                  {w.description && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{w.description}</p>
                  )}
                  <WorkoutVideo url={(w as any).video_url} />

                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Workout tiles */}
      <div className="space-y-4">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground uppercase">Workouts</h3>
            {workouts.length > 0 && (
              <Badge variant="secondary" className="text-[10px] font-mono">{workouts.length}</Badge>
            )}
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

        {/* Undo banner */}
        {trashed && (
          <div className="animate-fade-in flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <span className="text-sm text-foreground font-medium">
                "{trashed.name || `Workout ${trashed.workout_number}`}" removed
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={handleUndo} className="h-7 text-xs gap-1 border-destructive/30 hover:bg-destructive/10">
              <Undo2 className="h-3 w-3" /> Undo
            </Button>
          </div>
        )}

        {/* Workout tiles grid */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground p-4">Loading…</p>
        ) : workouts.length === 0 && drafts.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">No workouts yet</p>
            {isOwner && (
              <Button onClick={addDraft} variant="outline" className="gap-1">
                <Plus className="h-4 w-4" /> Add First Workout
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Existing workout tiles */}
            {workouts.map((w) => {
              const vis = (w as any).visibility || "visible";
              const visConfig = VISIBILITY_CONFIG[vis] || VISIBILITY_CONFIG.visible;
              const VisIcon = visConfig.icon;
              const revealAt = (w as any).scheduled_reveal_at;
              const wScoringType = (w as any).scoring_type || "points";
              const sc = getScoringConfig(wScoringType);
              const ScIcon = sc.icon;
              const timeCap = (w as any).time_cap_seconds;
              const isTrashAnimating = trashAnimatingId === w.id;

              return (
                <div
                  key={w.id}
                  className={`
                    border-l-4 ${sc.accent} bg-card border border-border rounded-xl overflow-hidden
                    transition-all duration-300 ease-out
                    ${isTrashAnimating ? "scale-95 opacity-0 -translate-x-8 max-h-0 py-0 my-0 border-0" : "scale-100 opacity-100 translate-x-0 animate-fade-in"}
                    ${vis === "hidden" ? "opacity-60" : ""}
                  `}
                  style={isTrashAnimating ? { transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)" } : undefined}
                >
                  {(
                    /* ── Display mode ── */
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Scoring type icon */}
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${sc.color}`}>
                          <ScIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">WOD {w.workout_number}</span>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${sc.color}`}>
                              {sc.label}
                            </Badge>
                            {timeCap && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> {Math.floor(timeCap / 60)}min
                              </span>
                            )}
                            <Badge variant="outline" className={`text-[10px] gap-1 ${visConfig.color}`}>
                              <VisIcon className="h-3 w-3" /> {visConfig.label}
                            </Badge>
                          </div>
                          <p className="font-bold text-foreground text-sm mt-1">{w.name || `Workout ${w.workout_number}`}</p>
                          {w.description && (
                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{w.description}</p>
                          )}
                          <WorkoutVideo url={(w as any).video_url} compact />

                        </div>

                        {/* Action buttons */}
                        {isOwner && (
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEdit(w)}
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            >
                              <Dumbbell className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleTrash(w)}
                              className="group h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4 transition-transform duration-200 group-hover:scale-125 group-hover:rotate-12" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Compact controls row */}
                      {isOwner && (
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50 flex-wrap">
                          {/* Scoring type quick switch */}
                          {isAutoMode && (
                            <div className="flex gap-0.5 mr-2">
                              {SCORING_TYPES.map((st) => {
                                const active = wScoringType === st.value;
                                const StIcon = st.icon;
                                return (
                                  <button
                                    key={st.value}
                                    onClick={() => handleScoringTypeChange(w.id, st.value)}
                                    className={`h-6 w-6 rounded flex items-center justify-center transition-all ${
                                      active ? st.activeColor : "text-muted-foreground hover:bg-muted/50"
                                    }`}
                                    title={st.label}
                                  >
                                    <StIcon className="h-3 w-3" />
                                  </button>
                                );
                              })}
                            </div>
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
                          {vis === "scheduled" && revealAt && (
                            <span className="text-[10px] text-muted-foreground">
                              Reveals {format(new Date(revealAt), "MMM d, HH:mm")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Draft tiles (new workout cards) ── */}
            {drafts.map((draft) => {
              const sc = getScoringConfig(draft.scoringType);
              return (
                <div
                  key={draft.localId}
                  className={`animate-scale-in border-l-4 ${sc.accent} bg-card border-2 border-dashed border-accent/40 rounded-xl overflow-hidden`}
                >
                  {/* Scoring type tabs for this tile */}
                  {isAutoMode && (
                    <div className="flex bg-muted/20 border-b border-border/50">
                      {SCORING_TYPES.map((st) => {
                        const active = draft.scoringType === st.value;
                        const StIcon = st.icon;
                        return (
                          <button
                            key={st.value}
                            type="button"
                            onClick={() => updateDraft(draft.localId, { scoringType: st.value as ScoringTypeValue })}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-all border-b-2 ${
                              active
                                ? `${st.activeColor} border-current`
                                : "text-muted-foreground border-transparent hover:text-foreground"
                            }`}
                          >
                            <StIcon className="h-3 w-3" />
                            <span className="hidden sm:inline">{st.shortLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    {/* Type hint */}
                    {isAutoMode && (
                      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${sc.color}`}>
                        <sc.icon className="h-3 w-3 shrink-0" />
                        {sc.desc}
                      </div>
                    )}

                    <Input
                      value={draft.name}
                      onChange={(e) => updateDraft(draft.localId, { name: e.target.value })}
                      placeholder={`WOD ${workouts.length + drafts.indexOf(draft) + 1} name`}
                      className="h-9 bg-background text-sm font-semibold"
                      maxLength={100}
                      autoFocus
                    />
                    <Textarea
                      value={draft.description}
                      onChange={(e) => updateDraft(draft.localId, { description: e.target.value })}
                      placeholder="Movements, reps, standards…"
                      className="bg-background min-h-[50px] text-sm"
                      maxLength={500}
                    />
                    <Input
                      value={draft.videoUrl}
                      onChange={(e) => updateDraft(draft.localId, { videoUrl: e.target.value })}
                      placeholder="Video link (YouTube / Vimeo) — optional"
                      className="h-8 bg-background text-sm"
                      maxLength={500}
                      inputMode="url"
                    />


                    {/* Time cap (contextual) */}
                    {isAutoMode && sc.hasTimeCap && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          value={draft.timeCap}
                          onChange={(e) => updateDraft(draft.localId, { timeCap: e.target.value })}
                          placeholder="Time cap"
                          className="h-8 bg-background text-sm w-24"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => saveDraft(draft)}
                        disabled={draft.saving || !draft.name.trim()}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1"
                      >
                        {draft.saving ? (
                          <div className="w-3.5 h-3.5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Save
                      </Button>
                      <button
                        onClick={() => discardDraft(draft.localId)}
                        className="group h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="h-4 w-4 transition-transform duration-200 group-hover:scale-125 group-hover:rotate-12" />
                      </button>
                      <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                        <EyeOff className="h-3 w-3" /> Hidden by default
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Add new workout button ── */}
        {isOwner && (workouts.length > 0 || drafts.length > 0) && (
          <button
            onClick={addDraft}
            className="w-full py-3 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-accent/50 hover:bg-accent/5 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-accent group"
          >
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-90" />
            New Workout
          </button>
        )}
      </div>

      {/* Right: Athlete preview */}
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
                    <div key={w.id} className={`border-l-4 ${sc.accent} pl-4 py-2 animate-fade-in`}>
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

      {/* ── Full-screen workout editor ── */}
      <Dialog open={!!editingId} onOpenChange={(o) => { if (!o) setEditingId(null); }}>
        <DialogContent className="max-w-3xl w-[96vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">
              Edit WOD {editNumber ?? ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {isAutoMode && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Scoring type</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {SCORING_TYPES.map((st) => {
                    const StIcon = st.icon;
                    const active = editScoring === st.value;
                    return (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() => setEditScoring(st.value)}
                        className={`flex items-center justify-center gap-1.5 h-10 rounded-lg border text-xs font-semibold transition-all ${
                          active ? st.activeColor : "border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <StIcon className="h-3.5 w-3.5" /> {st.shortLabel}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{getScoringConfig(editScoring).desc}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="wod-name" className="text-xs uppercase tracking-wider text-muted-foreground">Workout name</Label>
              <Input
                id="wod-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Fran"
                className="h-11 bg-background"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wod-desc" className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
              <Textarea
                id="wod-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Movements, reps, standards…"
                className="bg-background min-h-[240px] text-sm leading-relaxed font-mono"
                maxLength={2000}
              />
              <p className="text-[11px] text-muted-foreground text-right">{editDesc.length}/2000</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wod-video" className="text-xs uppercase tracking-wider text-muted-foreground">Video link</Label>
                <Input
                  id="wod-video"
                  value={editVideo}
                  onChange={(e) => setEditVideo(e.target.value)}
                  placeholder="YouTube / Vimeo — optional"
                  className="h-11 bg-background"
                  maxLength={500}
                  inputMode="url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wod-cap" className="text-xs uppercase tracking-wider text-muted-foreground">Time cap (min)</Label>
                <Input
                  id="wod-cap"
                  value={editTimeCap}
                  onChange={(e) => setEditTimeCap(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Optional"
                  className="h-11 bg-background"
                  inputMode="numeric"
                />
              </div>
            </div>

            {editVideo.trim() && <WorkoutVideo url={editVideo.trim()} />}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button
              onClick={() => editingId && handleSaveEdit(editingId)}
              disabled={saving}
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1"
            >
              <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save workout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
