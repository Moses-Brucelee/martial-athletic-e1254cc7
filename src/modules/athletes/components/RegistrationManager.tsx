import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2, XCircle, Clock, Users, UserPlus, Trash2,
  ArrowUpDown, Download, Upload, MoreVertical, Shield, AlertTriangle,
  ChevronDown, Search
} from "lucide-react";
import { toast } from "sonner";
import {
  useRegistrations,
  useCreateRegistration,
  useUpdateRegistrationStatus,
  useUpdateRegistrationDivision,
  useBulkUpdateStatus,
} from "@/modules/athletes/hooks";
import { useDivisions } from "@/modules/tournaments/hooks";
import {
  REGISTRATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/modules/athletes/types";
import type { AthleteRegistration } from "@/domain/competition";
import { athleteNameSchema } from "@/lib/validation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RegistrationManagerProps {
  competitionId: string;
  canAdmin: boolean;
}

export function RegistrationManager({ competitionId, canAdmin }: RegistrationManagerProps) {
  const { data: registrations = [], isLoading } = useRegistrations(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const createReg = useCreateRegistration();
  const updateStatus = useUpdateRegistrationStatus();
  const updateDivision = useUpdateRegistrationDivision();
  const bulkUpdate = useBulkUpdateStatus();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDivisionId, setNewDivisionId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Filter & search
  const filtered = useMemo(() => {
    let list = registrations;
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    if (filterDivision !== "all") list = list.filter((r) => r.division_id === filterDivision);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.athlete_name.toLowerCase().includes(q) ||
        (r.email && r.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [registrations, filterStatus, filterDivision, search]);

  // Stats
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    registrations.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [registrations]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const handleBulkAction = async (status: string) => {
    if (selectedIds.size === 0) return;
    try {
      await bulkUpdate.mutateAsync({ ids: Array.from(selectedIds), status, competitionId });
      toast.success(`${selectedIds.size} registration(s) updated to ${STATUS_LABELS[status]}`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Bulk update failed");
    }
  };

  const handleAddAthlete = async () => {
    const parsed = athleteNameSchema.safeParse(newName);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    try {
      await createReg.mutateAsync({
        competition_id: competitionId,
        athlete_name: newName.trim(),
        division_id: newDivisionId || null,
        registration_type: "organizer",
        status: "approved",
        email: newEmail || null,
      });
      toast.success("Athlete added");
      setNewName("");
      setNewEmail("");
      setNewDivisionId("");
      setShowAddForm(false);
    } catch {
      toast.error("Failed to add athlete");
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return;
    }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const nameIdx = header.findIndex((h) => h === "name" || h === "athlete_name" || h === "athlete");
    const emailIdx = header.findIndex((h) => h === "email");
    const divIdx = header.findIndex((h) => h === "division");

    if (nameIdx === -1) {
      toast.error("CSV must have a 'name' column");
      return;
    }

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const name = cols[nameIdx];
      if (!name) continue;

      const email = emailIdx >= 0 ? cols[emailIdx] || null : null;
      const divName = divIdx >= 0 ? cols[divIdx] : null;
      const divId = divName ? divisions.find((d) => d.name.toLowerCase() === divName.toLowerCase())?.id : null;

      try {
        await createReg.mutateAsync({
          competition_id: competitionId,
          athlete_name: name,
          division_id: divId || null,
          registration_type: "organizer",
          status: "approved",
          email,
        });
        imported++;
      } catch { /* skip row */ }
    }

    toast.success(`Imported ${imported} athlete(s)`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleExport = () => {
    const header = "Name,Email,Division,Status,Registration Type,Registered At\n";
    const rows = registrations.map((r) => {
      const divName = divisions.find((d) => d.id === r.division_id)?.name ?? "";
      return `"${r.athlete_name}","${r.email ?? ""}","${divName}","${r.status}","${r.registration_type}","${r.created_at}"`;
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${competitionId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Users className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{registrations.length}</p>
          <p className="text-xs text-muted-foreground uppercase">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Clock className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{statusCounts.pending ?? 0}</p>
          <p className="text-xs text-muted-foreground uppercase">Pending</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{(statusCounts.approved ?? 0) + (statusCounts.confirmed ?? 0)}</p>
          <p className="text-xs text-muted-foreground uppercase">Approved</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <AlertTriangle className="h-4 w-4 text-blue-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{statusCounts.waitlist ?? 0}</p>
          <p className="text-xs text-muted-foreground uppercase">Waitlist</p>
        </div>
      </div>

      {/* Actions bar */}
      {canAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <UserPlus className="h-4 w-4 mr-1" /> Add Athlete
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>

          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary">
                  Bulk ({selectedIds.size}) <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkAction("approved")}>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Approve All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("rejected")}>
                  <XCircle className="h-4 w-4 mr-2 text-destructive" /> Reject All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("waitlist")}>
                  <Clock className="h-4 w-4 mr-2 text-blue-600" /> Waitlist All
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction("removed")}>
                  <Trash2 className="h-4 w-4 mr-2 text-destructive" /> Remove All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Add athlete form */}
      {showAddForm && canAdmin && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase">Add Athlete Manually</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Athlete name" className="mt-1" maxLength={100} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@..." className="mt-1" maxLength={255} />
            </div>
            <div>
              <Label className="text-xs">Division</Label>
              <Select value={newDivisionId || "__none__"} onValueChange={(v) => setNewDivisionId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddAthlete} disabled={!newName.trim() || createReg.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Add & Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search athletes..."
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {REGISTRATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]} ({statusCounts[s] ?? 0})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {divisions.length > 0 && (
          <Select value={filterDivision} onValueChange={setFilterDivision}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Registration list */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {registrations.length === 0 ? "No registrations yet." : "No results match your filters."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          {canAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
              <Checkbox
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-xs text-muted-foreground font-medium uppercase">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${filtered.length} athletes`}
              </span>
            </div>
          )}

          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <RegistrationRow
                key={r.id}
                reg={r}
                divisions={divisions}
                canAdmin={canAdmin}
                isSelected={selectedIds.has(r.id)}
                onToggle={() => toggleSelect(r.id)}
                onStatusChange={(status) =>
                  updateStatus.mutate(
                    { id: r.id, status, competitionId },
                    {
                      onSuccess: () => toast.success(`Updated to ${STATUS_LABELS[status]}`),
                      onError: () => toast.error("Update failed"),
                    }
                  )
                }
                onDivisionChange={(divisionId) =>
                  updateDivision.mutate(
                    { id: r.id, divisionId, competitionId },
                    {
                      onSuccess: () => toast.success("Division updated"),
                      onError: () => toast.error("Update failed"),
                    }
                  )
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Individual Row ────────────────────────────────────────

function RegistrationRow({
  reg,
  divisions,
  canAdmin,
  isSelected,
  onToggle,
  onStatusChange,
  onDivisionChange,
}: {
  reg: AthleteRegistration;
  divisions: { id: string; name: string }[];
  canAdmin: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
  onDivisionChange: (divisionId: string) => void;
}) {
  const divName = divisions.find((d) => d.id === reg.division_id)?.name;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/20"}`}>
      {canAdmin && (
        <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{reg.athlete_name}</span>
          {reg.registration_type !== "self" && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {reg.registration_type === "organizer" ? "Staff" : "On behalf"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {divName && (
            <span className="text-xs text-muted-foreground">{divName}</span>
          )}
          {reg.email && (
            <span className="text-xs text-muted-foreground truncate">{reg.email}</span>
          )}
        </div>
      </div>

      <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[reg.status] ?? ""}`}>
        {STATUS_LABELS[reg.status] ?? reg.status}
      </Badge>

      {canAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {reg.status !== "approved" && (
              <DropdownMenuItem onClick={() => onStatusChange("approved")}>
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Approve
              </DropdownMenuItem>
            )}
            {reg.status !== "waitlist" && (
              <DropdownMenuItem onClick={() => onStatusChange("waitlist")}>
                <Clock className="h-4 w-4 mr-2 text-blue-600" /> Waitlist
              </DropdownMenuItem>
            )}
            {reg.status !== "rejected" && (
              <DropdownMenuItem onClick={() => onStatusChange("rejected")}>
                <XCircle className="h-4 w-4 mr-2 text-destructive" /> Reject
              </DropdownMenuItem>
            )}
            {reg.status !== "pending" && (
              <DropdownMenuItem onClick={() => onStatusChange("pending")}>
                <ArrowUpDown className="h-4 w-4 mr-2" /> Reset to Pending
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {divisions.length > 0 && divisions.map((d) => (
              reg.division_id !== d.id && (
                <DropdownMenuItem key={d.id} onClick={() => onDivisionChange(d.id)}>
                  Move to {d.name}
                </DropdownMenuItem>
              )
            ))}
            {divisions.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => onStatusChange("disqualified")} className="text-destructive">
              <Shield className="h-4 w-4 mr-2" /> Disqualify
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange("removed")} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
