import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Pencil } from "lucide-react";

interface CompetitionEditPanelProps {
  competition: any;
  canEdit: boolean;
}

export function CompetitionEditPanel({ competition, canEdit }: CompetitionEditPanelProps) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(competition.name ?? "");
  const [description, setDescription] = useState(competition.description ?? "");
  const [venue, setVenue] = useState(competition.venue ?? "");
  const [hostGym, setHostGym] = useState(competition.host_gym ?? "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    competition.start_date ? new Date(competition.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    competition.end_date ? new Date(competition.end_date) : undefined
  );
  const [regDeadline, setRegDeadline] = useState<Date | undefined>(
    competition.registration_deadline ? new Date(competition.registration_deadline) : undefined
  );
  const [maxAthletes, setMaxAthletes] = useState(competition.max_athletes?.toString() ?? "");

  useEffect(() => {
    setName(competition.name ?? "");
    setDescription(competition.description ?? "");
    setVenue(competition.venue ?? "");
    setHostGym(competition.host_gym ?? "");
    setStartDate(competition.start_date ? new Date(competition.start_date) : undefined);
    setEndDate(competition.end_date ? new Date(competition.end_date) : undefined);
    setRegDeadline(competition.registration_deadline ? new Date(competition.registration_deadline) : undefined);
    setMaxAthletes(competition.max_athletes?.toString() ?? "");
  }, [competition.id]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("competitions")
        .update({
          name: name.trim(),
          description: description || null,
          venue: venue || null,
          host_gym: hostGym || null,
          start_date: startDate?.toISOString() ?? null,
          end_date: endDate?.toISOString() ?? null,
          date: startDate ? startDate.toISOString().split("T")[0] : null,
          registration_deadline: regDeadline?.toISOString() ?? null,
          max_athletes: maxAthletes ? parseInt(maxAthletes) : null,
        })
        .eq("id", competition.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["competition", competition.id] });
      toast.success("Competition updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Pencil className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Edit Details</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-foreground font-medium">Competition Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} className="bg-background" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label className="text-foreground font-medium">Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} className="bg-background min-h-[80px]" />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-medium">Venue</Label>
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} disabled={!canEdit} className="bg-background" />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-medium">Host Gym</Label>
          <Input value={hostGym} onChange={(e) => setHostGym(e.target.value)} disabled={!canEdit} className="bg-background" />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-medium">Max Athletes</Label>
          <Input type="number" value={maxAthletes} onChange={(e) => setMaxAthletes(e.target.value)} disabled={!canEdit} className="bg-background" placeholder="Unlimited" />
        </div>

        <div />

        <div className="space-y-2">
          <Label className="text-foreground font-medium">Start Date & Time</Label>
          <DateTimePicker value={startDate} onChange={setStartDate} disabled={!canEdit} placeholder="Select start" />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-medium">End Date & Time</Label>
          <DateTimePicker value={endDate} onChange={setEndDate} disabled={!canEdit} placeholder="Select end" minDate={startDate} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label className="text-foreground font-medium">Registration Deadline</Label>
          <DateTimePicker value={regDeadline} onChange={setRegDeadline} disabled={!canEdit} placeholder="Deadline" />
          <p className="text-xs text-muted-foreground">Extend this to allow late registrations</p>
        </div>
      </div>

      {canEdit && (
        <Button onClick={handleSave} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      )}
    </div>
  );
}
