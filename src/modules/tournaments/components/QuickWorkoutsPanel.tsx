import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Plus, Trash2, Save, Eye, EyeOff, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useWorkouts } from "@/modules/tournaments/hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface QuickWorkoutsPanelProps {
  competitionId: string;
  isOwner: boolean;
}

const VISIBILITY_CONFIG: Record<string, { label: string; icon: typeof Eye; color: string }> = {
  visible: { label: "Visible", icon: Eye, color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
  hidden: { label: "Hidden", icon: EyeOff, color: "bg-destructive/10 text-destructive border-destructive/20" },
  scheduled: { label: "Scheduled", icon: Calendar, color: "bg-primary/10 text-primary border-primary/20" },
};

export function QuickWorkoutsPanel({ competitionId, isOwner }: QuickWorkoutsPanelProps) {
  const { data: workouts = [], isLoading } = useWorkouts(competitionId);
  const qc = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Workout name is required"); return; }
    setAdding(true);
    try {
      const nextNum = workouts.length > 0 ? Math.max(...workouts.map((w) => w.workout_number)) + 1 : 1;
      const { error } = await supabase.from("competition_workouts").insert({
        competition_id: competitionId,
        workout_number: nextNum,
        name: newName.trim(),
        description: newDesc.trim() || null,
        display_order: nextNum,
        scoring_type: "points",
        measurement_type: "points",
        workout_type: "custom",
        visibility: "hidden",
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["workouts", competitionId] });
      toast.success("Workout added (hidden by default)");
      setNewName(""); setNewDesc("");
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
            <p className="text-sm text-muted-foreground">No workouts yet. Add your first workout below.</p>
          ) : (
            <div className="space-y-3">
              {workouts.map((w) => {
                const vis = (w as any).visibility || "visible";
                const visConfig = VISIBILITY_CONFIG[vis] || VISIBILITY_CONFIG.visible;
                const VisIcon = visConfig.icon;
                const revealAt = (w as any).scheduled_reveal_at;

                return (
                  <div key={w.id} className={`bg-background border rounded-lg p-4 ${vis === "hidden" ? "border-destructive/20 opacity-75" : "border-border"}`}>
                    {editingId === w.id ? (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Workout {w.workout_number}</span>
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
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-black text-sm shrink-0">
                            {w.workout_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground text-sm">{w.name || `Workout ${w.workout_number}`}</p>
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

                        {/* Visibility control row */}
                        {isOwner && (
                          <div className="flex items-center gap-2 pt-1">
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

          {/* Add workout form */}
          {isOwner && (
            <div className="mt-4 bg-background border border-dashed border-accent/50 rounded-lg p-4 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add New Workout</p>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`e.g. WOD ${workouts.length + 1} — Fran`} className="h-9 bg-card text-sm" maxLength={100} onKeyDown={(e) => e.key === "Enter" && !adding && handleAdd()} />
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Workout description — movements, reps, time cap…" className="bg-card min-h-[60px] text-sm" maxLength={500} />
              <div className="flex gap-2 items-center">
                <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Plus className="h-3.5 w-3.5 mr-1" /> {adding ? "Adding…" : "Save & Add"}
                </Button>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <EyeOff className="h-3 w-3" /> Added as hidden by default
                </span>
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
          <p className="text-xs text-muted-foreground mb-4">This is what athletes will see. Hidden workouts are excluded.</p>

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
                {visibleWorkouts.map((w) => (
                  <div key={w.id} className="border-l-4 border-primary pl-4 py-2">
                    <span className="text-xs font-bold text-primary uppercase">WOD {w.workout_number}</span>
                    <h4 className="font-bold text-foreground text-sm mt-1">{w.name || `Workout ${w.workout_number}`}</h4>
                    {w.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{w.description}</p>}
                    <span className="inline-block mt-2 text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase">Points Scoring</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
