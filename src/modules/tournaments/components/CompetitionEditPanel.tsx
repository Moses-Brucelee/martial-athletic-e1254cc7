import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Pencil, X, MapPin, Calendar, Users, Building2, FileText } from "lucide-react";
import { format } from "date-fns";

interface CompetitionEditPanelProps {
  competition: any;
  canEdit: boolean;
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function formatDate(d?: string | null) {
  if (!d) return null;
  try { return format(new Date(d), "MMM d, yyyy · h:mm a"); } catch { return d; }
}

export function CompetitionEditPanel({ competition, canEdit }: CompetitionEditPanelProps) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
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
    if (!name.trim()) { toast.error("Name is required"); return; }
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
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setName(competition.name ?? "");
    setDescription(competition.description ?? "");
    setVenue(competition.venue ?? "");
    setHostGym(competition.host_gym ?? "");
    setStartDate(competition.start_date ? new Date(competition.start_date) : undefined);
    setEndDate(competition.end_date ? new Date(competition.end_date) : undefined);
    setRegDeadline(competition.registration_deadline ? new Date(competition.registration_deadline) : undefined);
    setMaxAthletes(competition.max_athletes?.toString() ?? "");
    setEditing(false);
  };

  // ── Display Mode ────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Competition Details</h3>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>

        {competition.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{competition.description}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
          <DetailRow icon={MapPin} label="Venue" value={competition.venue} />
          <DetailRow icon={Building2} label="Host Gym" value={competition.host_gym} />
          <DetailRow icon={Users} label="Max Athletes" value={competition.max_athletes?.toString() ?? "Unlimited"} />
          <DetailRow icon={Calendar} label="Start" value={formatDate(competition.start_date)} />
          <DetailRow icon={Calendar} label="End" value={formatDate(competition.end_date)} />
          <DetailRow icon={Calendar} label="Reg. Deadline" value={formatDate(competition.registration_deadline)} />
        </div>
      </div>
    );
  }

  // ── Edit Mode ───────────────────────────────────────────────────────
  return (
    <div className="bg-card border-2 border-primary/30 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Edit Details</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 text-xs gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-medium">Competition Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 bg-background text-sm" maxLength={100} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-medium">Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background min-h-[60px] text-sm" maxLength={500} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Venue</Label>
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} className="h-9 bg-background text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Host Gym</Label>
          <Input value={hostGym} onChange={(e) => setHostGym(e.target.value)} className="h-9 bg-background text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Max Athletes</Label>
          <Input type="number" value={maxAthletes} onChange={(e) => setMaxAthletes(e.target.value)} className="h-9 bg-background text-sm" placeholder="Unlimited" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Start</Label>
          <DateTimePicker value={startDate} onChange={setStartDate} placeholder="Start" defaultMonth={startDate} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">End</Label>
          <DateTimePicker value={endDate} onChange={setEndDate} placeholder="End" minDate={startDate} defaultMonth={endDate ?? startDate} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Reg. Deadline</Label>
          <DateTimePicker
            value={regDeadline}
            onChange={setRegDeadline}
            placeholder="Deadline"
            maxDate={startDate ? new Date(startDate.getTime() - 60_000) : undefined}
            defaultMonth={regDeadline ?? startDate}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 text-xs">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel} className="h-9 text-xs">Cancel</Button>
      </div>
    </div>
  );
}
