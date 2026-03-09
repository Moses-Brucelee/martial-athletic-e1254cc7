import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  CheckCircle2, XCircle, Clock, Users, UserPlus, Trash2,
  ArrowUpDown, Download, Upload, MoreVertical, Shield, AlertTriangle,
  ChevronDown, Search, FileDown
} from "lucide-react";
import { toast } from "sonner";
import {
  useRegistrations,
  useCreateRegistration,
  useUpdateRegistrationStatus,
  useUpdateRegistrationDivision,
  useBulkUpdateStatus,
} from "@/modules/athletes/hooks";
import { useCompetition, useDivisions } from "@/modules/tournaments/hooks";
import {
  REGISTRATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/modules/athletes/types";
import type { AthleteRegistration } from "@/domain/competition";
import { athleteNameSchema } from "@/lib/validation";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const { data: competition } = useCompetition(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const createReg = useCreateRegistration();
  const updateStatus = useUpdateRegistrationStatus();
  const updateDivision = useUpdateRegistrationDivision();
  const bulkUpdate = useBulkUpdateStatus();
  const isMobile = useIsMobile();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDivisionId, setNewDivisionId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newDob, setNewDob] = useState("");
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

  const approvedCount = (statusCounts.approved ?? 0) + (statusCounts.confirmed ?? 0);
  const waitlistCount = statusCounts.waitlist ?? 0;
  const maxAthletes = (competition as any)?.max_athletes as number | null;
  const capacityRemaining = maxAthletes != null ? Math.max(0, maxAthletes - approvedCount) : null;

  // Division capacity
  const divisionCapacity = useMemo(() => {
    const map: Record<string, { approved: number; max: number | null }> = {};
    divisions.forEach((d) => {
      const dMax = (d as any).max_athletes as number | null;
      const dApproved = registrations.filter(
        (r) => r.division_id === d.id && (r.status === "approved" || r.status === "confirmed")
      ).length;
      map[d.id] = { approved: dApproved, max: dMax };
    });
    return map;
  }, [divisions, registrations]);

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

    // Check capacity before approving
    let initialStatus = "approved";
    if (maxAthletes != null && approvedCount >= maxAthletes) {
      initialStatus = "waitlist";
    }
    if (newDivisionId) {
      const dc = divisionCapacity[newDivisionId];
      if (dc?.max != null && dc.approved >= dc.max) {
        initialStatus = "waitlist";
      }
    }

    try {
      await createReg.mutateAsync({
        competition_id: competitionId,
        athlete_name: newName.trim(),
        division_id: newDivisionId || null,
        registration_type: "organizer",
        status: initialStatus,
        email: newEmail || null,
        phone: newPhone || null,
        gender: newGender || null,
        date_of_birth: newDob || null,
      });
      toast.success(initialStatus === "waitlist" ? "Athlete added to waitlist (capacity full)" : "Athlete added");
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewGender("");
      setNewDob("");
      setNewDivisionId("");
      setShowAddForm(false);
    } catch {
      toast.error("Failed to add athlete");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, reg: AthleteRegistration) => {
    const wasApproved = reg.status === "approved" || reg.status === "confirmed";
    
    try {
      await updateStatus.mutateAsync({ id, status: newStatus, competitionId });
      toast.success(`Updated to ${STATUS_LABELS[newStatus]}`);
      
      // Auto-promote waitlisted athlete when someone is withdrawn/rejected/removed
      if (wasApproved && (newStatus === "withdrawn" || newStatus === "rejected" || newStatus === "removed")) {
        const waitlisted = registrations
          .filter((r) => r.status === "waitlist" && r.id !== id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // If same division, promote from same division first
        const sameDivWait = reg.division_id
          ? waitlisted.find((w) => w.division_id === reg.division_id)
          : waitlisted[0];
        const toPromote = sameDivWait || waitlisted[0];
        
        if (toPromote) {
          await updateStatus.mutateAsync({ id: toPromote.id, status: "approved", competitionId });
          toast.success(`${toPromote.athlete_name} promoted from waitlist`);
        }
      }
    } catch {
      toast.error("Update failed");
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
    const nameIdx = header.findIndex((h) => ["name", "athlete_name", "athlete"].includes(h));
    const emailIdx = header.findIndex((h) => ["email", "email_address"].includes(h));
    const phoneIdx = header.findIndex((h) => ["phone", "phone_number", "contact"].includes(h));
    const divIdx = header.findIndex((h) => ["division", "div", "category"].includes(h));
    const teamIdx = header.findIndex((h) => ["team", "gym", "box", "affiliate"].includes(h));
    const genderIdx = header.findIndex((h) => ["gender", "sex"].includes(h));

    if (nameIdx === -1) {
      toast.error("CSV must have a 'name' or 'athlete_name' column");
      return;
    }

    let imported = 0;
    let waitlisted = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const name = cols[nameIdx];
      if (!name) continue;

      const email = emailIdx >= 0 ? cols[emailIdx] || null : null;
      const phone = phoneIdx >= 0 ? cols[phoneIdx] || null : null;
      const gender = genderIdx >= 0 ? cols[genderIdx] || null : null;
      const divName = divIdx >= 0 ? cols[divIdx] : null;
      const divId = divName ? divisions.find((d) => d.name.toLowerCase() === divName.toLowerCase())?.id : null;

      // Auto-determine status based on capacity
      let status = "approved";
      const currentApproved = approvedCount + imported;
      if (maxAthletes != null && currentApproved >= maxAthletes) {
        status = "waitlist";
        waitlisted++;
      }
      if (divId) {
        const dc = divisionCapacity[divId];
        if (dc?.max != null) {
          const divApproved = dc.approved + registrations.filter(
            (r) => r.division_id === divId && (r.status === "approved" || r.status === "confirmed")
          ).length;
          if (divApproved >= dc.max) {
            status = "waitlist";
          }
        }
      }

      try {
        await createReg.mutateAsync({
          competition_id: competitionId,
          athlete_name: name,
          division_id: divId || null,
          registration_type: "organizer",
          status,
          email,
          phone,
          gender,
        });
        imported++;
      } catch { /* skip row */ }
    }

    const msg = waitlisted > 0
      ? `Imported ${imported} athlete(s), ${waitlisted} waitlisted`
      : `Imported ${imported} athlete(s)`;
    toast.success(msg);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleExport = () => {
    const header = "Name,Email,Phone,Division,Status,Registration Type,Payment Status,Registered At\n";
    const rows = registrations.map((r) => {
      const divName = divisions.find((d) => d.id === r.division_id)?.name ?? "";
      return `"${r.athlete_name}","${r.email ?? ""}","${r.phone ?? ""}","${divName}","${r.status}","${r.registration_type}","${r.payment_status}","${r.created_at}"`;
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${competitionId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const template = "athlete_name,email,phone,division,team,gender\nJohn Smith,john@email.com,0821234567,RX Male,Cape CrossFit,male\nSarah Lee,sarah@email.com,0828888888,RX Female,Strong Gym,female\n";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "registration-template.csv";
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
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{approvedCount}</p>
          <p className="text-xs text-muted-foreground uppercase font-semibold">Approved</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Clock className="h-4 w-4 text-blue-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{waitlistCount}</p>
          <p className="text-xs text-muted-foreground uppercase font-semibold">Waitlist</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          {maxAthletes != null ? (
            <>
              <AlertTriangle className={`h-4 w-4 mx-auto mb-1 ${capacityRemaining === 0 ? "text-destructive" : "text-accent"}`} />
              <p className="text-lg font-bold text-foreground">{capacityRemaining}</p>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Spots Left</p>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{statusCounts.pending ?? 0}</p>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Pending</p>
            </>
          )}
        </div>
      </div>

      {/* Capacity bar */}
      {maxAthletes != null && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Overall Capacity</span>
            <span className="text-sm text-muted-foreground">{approvedCount} / {maxAthletes}</span>
          </div>
          <Progress value={(approvedCount / maxAthletes) * 100} className="h-2" />
          {capacityRemaining === 0 && (
            <p className="text-xs text-destructive mt-1 font-medium">Competition is full — new registrations will be waitlisted</p>
          )}
        </div>
      )}

      {/* Division capacity */}
      {divisions.some((d) => (d as any).max_athletes != null) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {divisions.filter((d) => (d as any).max_athletes != null).map((d) => {
            const dc = divisionCapacity[d.id];
            if (!dc || dc.max == null) return null;
            const pct = (dc.approved / dc.max) * 100;
            const spotsLeft = Math.max(0, dc.max - dc.approved);
            return (
              <div key={d.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground truncate">{d.name}</span>
                  <span className="text-xs text-muted-foreground">{dc.approved}/{dc.max}</span>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className={`text-[10px] mt-1 font-medium ${spotsLeft === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {spotsLeft === 0 ? "Full" : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions bar */}
      {canAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          {isMobile ? (
            <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
              <SheetTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <UserPlus className="h-4 w-4 mr-1" /> Add Athlete
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left">Add Athlete</SheetTitle>
                </SheetHeader>
                <AddAthleteForm
                  newName={newName} setNewName={setNewName}
                  newEmail={newEmail} setNewEmail={setNewEmail}
                  newPhone={newPhone} setNewPhone={setNewPhone}
                  newGender={newGender} setNewGender={setNewGender}
                  newDob={newDob} setNewDob={setNewDob}
                  newDivisionId={newDivisionId} setNewDivisionId={setNewDivisionId}
                  divisions={divisions}
                  onSubmit={handleAddAthlete}
                  isPending={createReg.isPending}
                  onCancel={() => setShowAddForm(false)}
                />
              </SheetContent>
            </Sheet>
          ) : (
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <UserPlus className="h-4 w-4 mr-1" /> Add Athlete
            </Button>
          )}

          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
            <FileDown className="h-4 w-4 mr-1" /> Template
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

      {/* Add athlete form (desktop inline) */}
      {showAddForm && canAdmin && !isMobile && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase">Add Athlete Manually</h3>
          <AddAthleteForm
            newName={newName} setNewName={setNewName}
            newEmail={newEmail} setNewEmail={setNewEmail}
            newPhone={newPhone} setNewPhone={setNewPhone}
            newGender={newGender} setNewGender={setNewGender}
            newDob={newDob} setNewDob={setNewDob}
            newDivisionId={newDivisionId} setNewDivisionId={setNewDivisionId}
            divisions={divisions}
            onSubmit={handleAddAthlete}
            isPending={createReg.isPending}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
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
      ) : isMobile ? (
        /* Mobile card layout */
        <div className="space-y-3">
          {canAdmin && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-xs text-muted-foreground font-medium uppercase">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${filtered.length} athletes`}
              </span>
            </div>
          )}
          {filtered.map((r) => (
            <MobileRegistrationCard
              key={r.id}
              reg={r}
              divisions={divisions}
              canAdmin={canAdmin}
              isSelected={selectedIds.has(r.id)}
              onToggle={() => toggleSelect(r.id)}
              onStatusChange={(status) => handleStatusChange(r.id, status, r)}
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
      ) : (
        /* Desktop table layout */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
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
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_80px_40px] gap-2 px-4 py-2 text-xs text-muted-foreground font-semibold uppercase border-b border-border bg-muted/20">
            <span>Athlete</span>
            <span>Division</span>
            <span>Status</span>
            <span>Payment</span>
            <span>Type</span>
            <span></span>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <DesktopRegistrationRow
                key={r.id}
                reg={r}
                divisions={divisions}
                canAdmin={canAdmin}
                isSelected={selectedIds.has(r.id)}
                onToggle={() => toggleSelect(r.id)}
                onStatusChange={(status) => handleStatusChange(r.id, status, r)}
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

// ── Add Athlete Form ──────────────────────────────────────
function AddAthleteForm({
  newName, setNewName,
  newEmail, setNewEmail,
  newPhone, setNewPhone,
  newGender, setNewGender,
  newDob, setNewDob,
  newDivisionId, setNewDivisionId,
  divisions,
  onSubmit,
  isPending,
  onCancel,
}: {
  newName: string; setNewName: (v: string) => void;
  newEmail: string; setNewEmail: (v: string) => void;
  newPhone: string; setNewPhone: (v: string) => void;
  newGender: string; setNewGender: (v: string) => void;
  newDob: string; setNewDob: (v: string) => void;
  newDivisionId: string; setNewDivisionId: (v: string) => void;
  divisions: { id: string; name: string }[];
  onSubmit: () => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4 pt-2">
      <div>
        <Label className="text-xs font-medium">Athlete Name *</Label>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" className="mt-1" maxLength={100} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Email</Label>
          <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@..." className="mt-1" maxLength={255} />
        </div>
        <div>
          <Label className="text-xs font-medium">Phone</Label>
          <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 234 567" className="mt-1" maxLength={20} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Gender</Label>
          <Select value={newGender || "__none__"} onValueChange={(v) => setNewGender(v === "__none__" ? "" : v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium">Date of Birth</Label>
          <Input type="date" value={newDob} onChange={(e) => setNewDob(e.target.value)} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs font-medium">Division</Label>
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
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={onSubmit} disabled={!newName.trim() || isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground flex-1">
          Add Athlete
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Mobile Card ───────────────────────────────────────────
function MobileRegistrationCard({
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
    <div className={`bg-card border rounded-xl p-4 transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border"}`}>
      <div className="flex items-start gap-3">
        {canAdmin && <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{reg.athlete_name}</span>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[reg.status] ?? ""}`}>
              {STATUS_LABELS[reg.status] ?? reg.status}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {divName && <span className="text-xs text-muted-foreground">{divName}</span>}
            {reg.email && <span className="text-xs text-muted-foreground truncate">{reg.email}</span>}
            {reg.registration_type !== "self" && (
              <Badge variant="outline" className="text-[9px] h-4">
                {reg.registration_type === "organizer" ? "Staff" : "On behalf"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-muted-foreground">Payment:</span>
            <Badge variant="outline" className="text-[9px] h-4">{reg.payment_status}</Badge>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {canAdmin && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
          {reg.status !== "approved" && (
            <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={() => onStatusChange("approved")}>
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> Approve
            </Button>
          )}
          {reg.status !== "waitlist" && (
            <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={() => onStatusChange("waitlist")}>
              <Clock className="h-3 w-3 mr-1 text-blue-600" /> Waitlist
            </Button>
          )}
          {reg.status !== "rejected" && (
            <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={() => onStatusChange("rejected")}>
              <XCircle className="h-3 w-3 mr-1 text-destructive" /> Reject
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {reg.status !== "pending" && (
                <DropdownMenuItem onClick={() => onStatusChange("pending")}>
                  <ArrowUpDown className="h-4 w-4 mr-2" /> Reset to Pending
                </DropdownMenuItem>
              )}
              {divisions.length > 0 && <DropdownMenuSeparator />}
              {divisions.map((d) =>
                reg.division_id !== d.id ? (
                  <DropdownMenuItem key={d.id} onClick={() => onDivisionChange(d.id)}>
                    Move to {d.name}
                  </DropdownMenuItem>
                ) : null
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onStatusChange("withdrawn")} className="text-destructive">
                Withdraw
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("removed")} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

// ── Desktop Row ───────────────────────────────────────────
function DesktopRegistrationRow({
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
    <div className={`grid grid-cols-[1fr_120px_100px_100px_80px_40px] gap-2 items-center px-4 py-3 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/20"}`}>
      <div className="flex items-center gap-2 min-w-0">
        {canAdmin && <Checkbox checked={isSelected} onCheckedChange={onToggle} />}
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">{reg.athlete_name}</span>
          {reg.email && <span className="text-xs text-muted-foreground truncate block">{reg.email}</span>}
        </div>
      </div>

      <span className="text-xs text-muted-foreground truncate">{divName ?? "—"}</span>

      <Badge variant="outline" className={`text-[10px] justify-center ${STATUS_COLORS[reg.status] ?? ""}`}>
        {STATUS_LABELS[reg.status] ?? reg.status}
      </Badge>

      <Badge variant="outline" className="text-[10px] justify-center">
        {reg.payment_status}
      </Badge>

      <Badge variant="outline" className="text-[10px] justify-center">
        {reg.registration_type === "organizer" ? "Staff" : reg.registration_type === "self" ? "Self" : "Proxy"}
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
            {divisions.map((d) =>
              reg.division_id !== d.id ? (
                <DropdownMenuItem key={d.id} onClick={() => onDivisionChange(d.id)}>
                  Move to {d.name}
                </DropdownMenuItem>
              ) : null
            )}
            {divisions.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => onStatusChange("withdrawn")} className="text-destructive">
              Withdraw
            </DropdownMenuItem>
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
