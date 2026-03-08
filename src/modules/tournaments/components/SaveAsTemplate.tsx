import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useWorkouts, useWorkoutMovements } from "@/modules/tournaments/hooks";
import { useDivisions } from "@/modules/tournaments/hooks";
import { useSaveTemplate } from "@/modules/tournaments/hooks-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import type { Competition } from "@/domain/competition";

interface SaveAsTemplateProps {
  competition: Competition;
  competitionId: string;
}

export function SaveAsTemplate({ competition, competitionId }: SaveAsTemplateProps) {
  const { user } = useAuth();
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const saveTemplate = useSaveTemplate();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !user) return;

    const templateData = {
      competition_type: competition.competition_type || competition.type,
      age_category_type: competition.age_category_type,
      min_age: competition.min_age,
      max_age: competition.max_age,
      divisions: divisions.map((d) => ({ name: d.name, sort_order: d.sort_order })),
      workouts: workouts.map((w) => ({
        name: w.name,
        workout_number: w.workout_number,
        workout_type: w.workout_type,
        scoring_type: w.scoring_type,
        time_cap_seconds: w.time_cap_seconds,
        measurement_type: w.measurement_type,
      })),
    };

    try {
      await saveTemplate.mutateAsync({
        name: name.trim(),
        description: description || null,
        competition_type: competition.competition_type || "crossfit",
        template_data: templateData,
        is_public: isPublic,
        created_by: user.id,
      });
      toast.success("Template saved!");
      setOpen(false);
      setName("");
      setDescription("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <BookmarkPlus className="h-4 w-4" /> Save as Template
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">Save as Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Template Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard CrossFit Throwdown" className="h-10 bg-background" maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description" className="bg-background min-h-[60px]" maxLength={300} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground">Make public (visible to all users)</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <p className="text-xs text-muted-foreground">
            Saves {divisions.length} division(s) and {workouts.length} workout(s) as a reusable template.
          </p>
          <Button onClick={handleSave} disabled={saveTemplate.isPending || !name.trim()}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
            {saveTemplate.isPending ? "Saving…" : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
