import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  tier_slug: string;
  tier_assigned_at: string | null;
  email?: string;
}

interface TierOption {
  key: string;
  name: string;
  sort_order: number;
}

interface ChangeLogRow {
  id: string;
  user_id: string;
  old_tier_slug: string | null;
  new_tier_slug: string;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
}

const PAGE_SIZE = 20;

async function fetchTiers(): Promise<TierOption[]> {
  const { data } = await supabase
    .from("pricing_tiers")
    .select("key, name, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as TierOption[];
}

async function fetchProfilesWithEmails(): Promise<ProfileRow[]> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, tier_slug, tier_assigned_at")
    .order("tier_assigned_at", { ascending: false });
  const rows = (profiles ?? []) as ProfileRow[];
  if (!rows.length) return rows;
  const { data: emails } = await supabase.rpc("admin_get_user_emails", {
    p_user_ids: rows.map((r) => r.user_id),
  });
  const emailMap = new Map((emails ?? []).map((e: any) => [e.user_id, e.email]));
  return rows.map((r) => ({ ...r, email: emailMap.get(r.user_id) ?? "" }));
}

async function fetchRecentChanges(): Promise<ChangeLogRow[]> {
  const { data } = await supabase
    .from("tier_change_log")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(20);
  return (data ?? []) as ChangeLogRow[];
}

export function UserTiersManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [newTier, setNewTier] = useState<string>("");
  const [reason, setReason] = useState("");

  const tiersQ = useQuery({ queryKey: ["pricing-tiers-admin"], queryFn: fetchTiers });
  const profilesQ = useQuery({ queryKey: ["admin-tier-profiles"], queryFn: fetchProfilesWithEmails });
  const changesQ = useQuery({ queryKey: ["admin-tier-changes"], queryFn: fetchRecentChanges });

  const tiers = tiersQ.data ?? [];
  const tierByKey = useMemo(() => new Map(tiers.map((t) => [t.key, t])), [tiers]);

  // Map of changed_by user_id -> email for log display
  const changeUserIds = useMemo(() => {
    const ids = new Set<string>();
    (changesQ.data ?? []).forEach((c) => {
      ids.add(c.user_id);
      if (c.changed_by) ids.add(c.changed_by);
    });
    return Array.from(ids);
  }, [changesQ.data]);

  const emailLookupQ = useQuery({
    queryKey: ["admin-tier-changes-emails", changeUserIds.join(",")],
    queryFn: async () => {
      if (!changeUserIds.length) return new Map<string, string>();
      const { data } = await supabase.rpc("admin_get_user_emails", { p_user_ids: changeUserIds });
      return new Map<string, string>((data ?? []).map((e: any) => [e.user_id, e.email]));
    },
    enabled: changeUserIds.length > 0,
  });
  const emailMap = emailLookupQ.data ?? new Map<string, string>();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = profilesQ.data ?? [];
    if (!term) return all;
    return all.filter(
      (p) =>
        (p.email ?? "").toLowerCase().includes(term) ||
        (p.display_name ?? "").toLowerCase().includes(term)
    );
  }, [search, profilesQ.data]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openEdit = (p: ProfileRow) => {
    setEditing(p);
    setNewTier(p.tier_slug);
    setReason("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing || !user) throw new Error("Missing context");
      if (!reason.trim()) throw new Error("Reason is required");
      if (newTier === editing.tier_slug) throw new Error("Tier unchanged");

      const { error } = await supabase
        .from("profiles")
        .update({
          tier_slug: newTier,
          tier_assigned_at: new Date().toISOString(),
          tier_assigned_by: user.id,
        })
        .eq("user_id", editing.user_id);
      if (error) throw error;

      // Backfill reason on the log row the trigger just wrote.
      await supabase
        .from("tier_change_log")
        .update({ reason })
        .eq("user_id", editing.user_id)
        .eq("new_tier_slug", newTier)
        .is("reason", null)
        .order("changed_at", { ascending: false })
        .limit(1);

      return { oldTier: editing.tier_slug, newTier };
    },
    onSuccess: ({ oldTier, newTier }) => {
      const oldOrder = tierByKey.get(oldTier)?.sort_order ?? 0;
      const newOrder = tierByKey.get(newTier)?.sort_order ?? 0;
      const newName = tierByKey.get(newTier)?.name ?? newTier;
      const direction = newOrder > oldOrder ? "upgraded" : "downgraded";
      toast.success(`User ${direction} to ${newName}`);
      if (editing) qc.invalidateQueries({ queryKey: ["user-tier", editing.user_id] });
      qc.invalidateQueries({ queryKey: ["admin-tier-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-tier-changes"] });
      setEditing(null);
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to update tier"),
  });

  const tierBadge = (slug: string) => {
    const name = tierByKey.get(slug)?.name ?? slug;
    const variant = slug === "free" ? "secondary" : slug === "tournament_pro" ? "default" : "outline";
    return <Badge variant={variant as any}>{name}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or display name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Current Tier</TableHead>
              <TableHead>Last Changed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profilesQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((p) => (
                <TableRow key={p.user_id}>
                  <TableCell className="font-mono text-xs">{p.email || "—"}</TableCell>
                  <TableCell>{p.display_name || "—"}</TableCell>
                  <TableCell>{tierBadge(p.tier_slug)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.tier_assigned_at
                      ? formatDistanceToNow(new Date(p.tier_assigned_at), { addSuffix: true })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages} · {filtered.length} users
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span>Recent tier changes ({changesQ.data?.length ?? 0})</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(changesQ.data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{emailMap.get(c.user_id) ?? c.user_id.slice(0, 8)}</TableCell>
                    <TableCell>{c.old_tier_slug ? tierBadge(c.old_tier_slug) : "—"}</TableCell>
                    <TableCell>{tierBadge(c.new_tier_slug)}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs">{c.reason || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.changed_by ? emailMap.get(c.changed_by) ?? c.changed_by.slice(0, 8) : "system"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.changed_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
                {(changesQ.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No tier changes yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Tier</DialogTitle>
            <DialogDescription>
              {editing?.email || editing?.display_name || editing?.user_id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tier</label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this tier being changed?"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !reason.trim() || newTier === editing?.tier_slug}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
