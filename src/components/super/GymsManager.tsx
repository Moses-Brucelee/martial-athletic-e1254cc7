import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GymRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website_url: string | null;
  owner_id: string;
  created_at: string;
  owner_name?: string | null;
  member_count?: number;
}

interface OwnerOption {
  id: string;
  display_name: string | null;
  full_name: string | null;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function GymsManager() {
  const [gyms, setGyms] = useState<GymRow[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GymRow | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<GymRow | null>(null);
  const [search, setSearch] = useState("");

  // form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: gymsData, error: gErr }, { data: profilesData }] = await Promise.all([
        supabase.from("gyms").select("*").order("name"),
        supabase.from("profiles").select("id, display_name, full_name").order("display_name"),
      ]);
      if (gErr) throw gErr;

      const profileMap = new Map((profilesData ?? []).map((p: any) => [p.id, p]));
      const gymIds = (gymsData ?? []).map((g: any) => g.id);
      let counts: Record<string, number> = {};
      if (gymIds.length) {
        const { data: members } = await supabase
          .from("gym_members")
          .select("gym_id, status")
          .in("gym_id", gymIds)
          .eq("status", "active");
        counts = (members ?? []).reduce<Record<string, number>>((acc, m: any) => {
          acc[m.gym_id] = (acc[m.gym_id] ?? 0) + 1;
          return acc;
        }, {});
      }

      setGyms((gymsData ?? []).map((g: any) => {
        const p: any = profileMap.get(g.owner_id);
        return {
          ...g,
          owner_name: p?.display_name ?? p?.full_name ?? null,
          member_count: counts[g.id] ?? 0,
        };
      }));
      setOwners((profilesData ?? []) as OwnerOption[]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load gyms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName(""); setSlug(""); setDescription(""); setWebsiteUrl(""); setOwnerId("");
    setOpen(true);
  };

  const openEdit = (g: GymRow) => {
    setEditing(g);
    setName(g.name);
    setSlug(g.slug);
    setDescription(g.description ?? "");
    setWebsiteUrl(g.website_url ?? "");
    setOwnerId(g.owner_id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !ownerId) {
      toast.error("Name and owner are required");
      return;
    }
    setSaving(true);
    try {
      const finalSlug = (slug.trim() || slugify(name)) + (editing ? "" : `-${Math.random().toString(36).slice(2, 8)}`);
      const payload = {
        name: name.trim(),
        slug: editing ? slug.trim() : finalSlug,
        description: description.trim() || null,
        website_url: websiteUrl.trim() || null,
        owner_id: ownerId,
      };
      if (editing) {
        const { error } = await supabase.from("gyms").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Gym updated");
      } else {
        const { error } = await supabase.from("gyms").insert(payload);
        if (error) throw error;
        toast.success("Gym created");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const { error } = await supabase.from("gyms").delete().eq("id", deleting.id);
      if (error) throw error;
      toast.success("Gym deleted");
      setDeleting(null);
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Delete failed");
    }
  };

  const filtered = gyms.filter((g) =>
    !search ||
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.owner_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Gyms & Affiliations</h2>
          <p className="text-sm text-muted-foreground">Create, update and manage all gyms across the platform.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Gym
        </Button>
      </div>

      <Input
        placeholder="Search by gym or owner name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No gyms found.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Slug</th>
                <th className="text-left p-3 font-medium">Owner</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Members</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-t border-border">
                  <td className="p-3 font-medium">{g.name}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell font-mono text-xs">{g.slug}</td>
                  <td className="p-3 text-muted-foreground">{g.owner_name ?? "—"}</td>
                  <td className="p-3 hidden sm:table-cell">{g.member_count}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(g)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(g)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Gym" : "Create Gym"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CrossFit Downtown" />
            </div>
            {editing && (
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono text-sm" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Owner *</Label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select owner...</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.display_name ?? o.full_name ?? o.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the gym and remove all member affiliations. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
