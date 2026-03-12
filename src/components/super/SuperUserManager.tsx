import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Search, Trash2, AlertTriangle, User } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  subscription_tier: string;
  created_at: string;
}

export function SuperUserManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    supabase
      .from("profiles")
      .select("id, user_id, display_name, full_name, subscription_tier, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProfiles(data);
      });
  };

  useEffect(load, []);

  const filtered = profiles.filter((p) => {
    const term = search.toLowerCase();
    return (
      (p.display_name?.toLowerCase().includes(term) ?? false) ||
      (p.full_name?.toLowerCase().includes(term) ?? false) ||
      p.user_id.includes(term)
    );
  });

  const handleDeleteUser = async (profile: Profile) => {
    setSaving(true);
    try {
      // Call edge function to delete auth user (requires service role)
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: profile.user_id },
      });
      if (error) throw error;
      toast.success(`User "${profile.display_name || profile.user_id}" deleted`);
      setDeleting(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-background" />
      </div>

      <p className="text-xs text-muted-foreground">{profiles.length} total users</p>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-semibold text-foreground text-sm truncate">{p.display_name || p.full_name || "Unnamed"}</p>
              </div>
              <p className="text-xs text-muted-foreground ml-6">Tier: {p.subscription_tier} • Joined: {new Date(p.created_at).toLocaleDateString()}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0" onClick={() => setDeleting(p)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete User
            </DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{deleting?.display_name || deleting?.user_id}</strong> and their profile. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleting && handleDeleteUser(deleting)} disabled={saving}>
              {saving ? "Deleting…" : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
