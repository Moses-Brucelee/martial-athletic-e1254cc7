import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Search, ExternalLink, Pencil, Trash2, Save, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Competition {
  id: string;
  name: string;
  status: string;
  description: string | null;
  venue: string | null;
  host_gym: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  max_athletes: number | null;
  competition_type: string | null;
  created_by: string;
  created_at: string;
}

export function SuperCompetitionEditor() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Competition | null>(null);
  const [deleting, setDeleting] = useState<Competition | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    supabase
      .from("competitions")
      .select("id, name, status, description, venue, host_gym, start_date, end_date, registration_deadline, max_athletes, competition_type, created_by, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCompetitions(data);
      });
  };

  useEffect(load, []);

  const filtered = competitions.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (comp: Competition) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("competitions")
        .update({
          name: comp.name,
          description: comp.description,
          venue: comp.venue,
          host_gym: comp.host_gym,
          start_date: comp.start_date,
          end_date: comp.end_date,
          registration_deadline: comp.registration_deadline,
          max_athletes: comp.max_athletes,
          status: comp.status,
          date: comp.start_date ? comp.start_date.split("T")[0] : null,
        })
        .eq("id", comp.id);
      if (error) throw error;
      toast.success("Competition updated");
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      // Delete dependent data first
      await supabase.from("competition_scores").delete().eq("competition_id", id);
      await supabase.from("workout_rankings").delete().eq("competition_id", id);
      await supabase.from("competition_leaderboards").delete().eq("competition_id", id);
      await supabase.from("heat_assignments").delete().in("heat_id",
        (await supabase.from("heat_schedule").select("id").eq("competition_id", id)).data?.map(h => h.id) ?? []
      );
      await supabase.from("heat_schedule").delete().eq("competition_id", id);
      await supabase.from("judge_assignments").delete().eq("competition_id", id);
      await supabase.from("competition_judges").delete().eq("competition_id", id);
      await supabase.from("competition_participants").delete().eq("competition_id", id);
      await supabase.from("athlete_registrations").delete().eq("competition_id", id);
      await supabase.from("workout_movements").delete().in("workout_id",
        (await supabase.from("competition_workouts").select("id").eq("competition_id", id)).data?.map(w => w.id) ?? []
      );
      await supabase.from("competition_workouts").delete().eq("competition_id", id);
      await supabase.from("competition_divisions").delete().eq("competition_id", id);
      await supabase.from("competition_teams").delete().eq("competition_id", id);
      await supabase.from("competition_audit_events").delete().eq("competition_id", id);
      await supabase.from("competition_settings").delete().eq("competition_id", id);
      await supabase.from("leaderboard_history").delete().eq("competition_id", id);
      const { error } = await supabase.from("competitions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Competition deleted");
      setDeleting(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search competitions..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-background" />
      </div>

      <div className="space-y-2">
        {filtered.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground text-sm truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground">Status: {c.status} • {new Date(c.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => setEditing({ ...c })}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/competition/${c.id}`)}>
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(c)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Competition</DialogTitle>
            <DialogDescription>Override any field as super admin.</DialogDescription>
          </DialogHeader>
          {editing && <CompetitionEditForm comp={editing} setComp={setEditing} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && handleSave(editing)} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Competition
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleting?.name}</strong> and all associated data (scores, teams, registrations, workouts). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleting && handleDelete(deleting.id)} disabled={saving}>
              {saving ? "Deleting…" : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompetitionEditForm({ comp, setComp }: { comp: Competition; setComp: (c: Competition) => void }) {
  const update = (field: keyof Competition, value: any) => setComp({ ...comp, [field]: value });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={comp.name} onChange={(e) => update("name", e.target.value)} className="bg-background" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={comp.description ?? ""} onChange={(e) => update("description", e.target.value || null)} className="bg-background" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Venue</Label>
          <Input value={comp.venue ?? ""} onChange={(e) => update("venue", e.target.value || null)} className="bg-background" />
        </div>
        <div className="space-y-2">
          <Label>Host Gym</Label>
          <Input value={comp.host_gym ?? ""} onChange={(e) => update("host_gym", e.target.value || null)} className="bg-background" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Status Override</Label>
        <Select value={comp.status} onValueChange={(v) => update("status", v)}>
          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <DateTimePicker
            value={comp.start_date ? new Date(comp.start_date) : undefined}
            onChange={(d) => update("start_date", d?.toISOString() ?? null)}
            placeholder="Start"
            defaultMonth={comp.start_date ? new Date(comp.start_date) : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <DateTimePicker
            value={comp.end_date ? new Date(comp.end_date) : undefined}
            onChange={(d) => update("end_date", d?.toISOString() ?? null)}
            placeholder="End"
            minDate={comp.start_date ? new Date(comp.start_date) : undefined}
            defaultMonth={comp.end_date ? new Date(comp.end_date) : comp.start_date ? new Date(comp.start_date) : undefined}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Registration Deadline</Label>
        <DateTimePicker
          value={comp.registration_deadline ? new Date(comp.registration_deadline) : undefined}
          onChange={(d) => update("registration_deadline", d?.toISOString() ?? null)}
          placeholder="Deadline"
          maxDate={comp.start_date ? new Date(new Date(comp.start_date).getTime() - 60_000) : undefined}
          defaultMonth={comp.registration_deadline ? new Date(comp.registration_deadline) : comp.start_date ? new Date(comp.start_date) : undefined}
        />
      </div>
      <div className="space-y-2">
        <Label>Max Athletes</Label>
        <Input type="number" value={comp.max_athletes ?? ""} onChange={(e) => update("max_athletes", e.target.value ? parseInt(e.target.value) : null)} className="bg-background" placeholder="Unlimited" />
      </div>
    </div>
  );
}
