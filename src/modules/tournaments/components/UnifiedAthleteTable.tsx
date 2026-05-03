import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2, XCircle, Clock, Users, UserPlus, Trash2, Search,
  Upload, Download, FileDown, ChevronDown, MoreVertical, AlertTriangle, Flame, Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  useRegistrations, useCreateRegistration, useUpdateRegistrationStatus,
  useUpdateRegistrationDivision, useUpdateRegistrationTeam, useBulkUpdateStatus,
} from "@/modules/athletes/hooks";
import { useCompetition, useDivisions, useTeams, useAddTeam } from "@/modules/tournaments/hooks";
import { useHeats, useAllHeatAssignments } from "@/modules/tournaments/hooks-engine";
import { STATUS_LABELS, STATUS_COLORS, REGISTRATION_STATUSES } from "@/modules/athletes/types";
import type { AthleteRegistration } from "@/domain/competition";
import { athleteNameSchema } from "@/lib/validation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EditRegistrationDialog } from "@/modules/athletes/components/EditRegistrationDialog";

interface Props {
  competitionId: string;
  canAdmin: boolean;
}

export function UnifiedAthleteTable({ competitionId, canAdmin }: Props) {
  const { data: registrations = [], isLoading } = useRegistrations(competitionId);
  const { data: competition } = useCompetition(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);
  const { data: teams = [] } = useTeams(competitionId);
  const { data: heats = [] } = useHeats(competitionId);
  const { data: allAssignments = [] } = useAllHeatAssignments(competitionId);
  const addTeamMutation = useAddTeam();
  const createReg = useCreateRegistration();
  const updateStatus = useUpdateRegistrationStatus();
  const updateDivision = useUpdateRegistrationDivision();
  const updateTeam = useUpdateRegistrationTeam();
  const bulkUpdate = useBulkUpdateStatus();
  const isMobile = useIsMobile();

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDivisionId, setNewDivisionId] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newDob, setNewDob] = useState("");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDivisionId, setNewTeamDivisionId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Build team→heat+lane lookup
  const teamHeatMap = useMemo(() => {
    const map: Record<string, { heatNumber: number; lane: number | null; heatId: string }[]> = {};
    allAssignments.forEach((a: any) => {
      if (!map[a.team_id]) map[a.team_id] = [];
      map[a.team_id].push({ heatNumber: a.heat_number, lane: a.lane_number, heatId: a.heat_id });
    });
    return map;
  }, [allAssignments]);

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

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    registrations.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [registrations]);

  const approvedCount = (statusCounts.approved ?? 0) + (statusCounts.confirmed ?? 0);
  const maxAthletes = (competition as any)?.max_athletes as number | null;
  const capacityRemaining = maxAthletes != null ? Math.max(0, maxAthletes - approvedCount) : null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id)));
  };

  const handleBulkAction = async (status: string) => {
    if (selectedIds.size === 0) return;
    try {
      await bulkUpdate.mutateAsync({ ids: Array.from(selectedIds), status, competitionId });
      toast.success(`${selectedIds.size} updated to ${STATUS_LABELS[status]}`);
      setSelectedIds(new Set());
    } catch { toast.error("Bulk update failed"); }
  };

  const handleCreateTeam = async () => {
    const name = newTeamName.trim();
    if (!name) { toast.error("Team name required"); return; }
    const dup = teams.find((t) => t.team_name.toLowerCase() === name.toLowerCase());
    if (dup) { toast.error("Team already exists"); return; }
    const div = divisions.find((d) => d.id === newTeamDivisionId);
    try {
      await addTeamMutation.mutateAsync({
        competition_id: competitionId,
        team_name: name,
        division: div?.name || null,
        division_id: newTeamDivisionId || null,
      });
      toast.success("Team created!");
      setNewTeamName(""); setNewTeamDivisionId(""); setShowCreateTeam(false);
    } catch { toast.error("Failed to create team"); }
  };

  const handleAddAthlete = async () => {
    const parsed = athleteNameSchema.safeParse(newName);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    let initialStatus = "approved";
    if (maxAthletes != null && approvedCount >= maxAthletes) initialStatus = "waitlist";
    try {
      await createReg.mutateAsync({
        competition_id: competitionId,
        athlete_name: newName.trim(),
        division_id: newDivisionId || null,
        team_id: newTeamId || null,
        registration_type: "organizer",
        status: initialStatus,
        email: newEmail || null,
        phone: newPhone || null,
        gender: newGender || null,
        date_of_birth: newDob || null,
      });
      toast.success(initialStatus === "waitlist" ? "Added to waitlist" : "Athlete added");
      setNewName(""); setNewEmail(""); setNewPhone(""); setNewGender(""); setNewDob(""); setNewDivisionId(""); setNewTeamId("");
      setShowAddForm(false);
    } catch { toast.error("Failed to add athlete"); }
  };

  const handleStatusChange = async (id: string, newStatus: string, reg: AthleteRegistration) => {
    const wasApproved = reg.status === "approved" || reg.status === "confirmed";
    try {
      await updateStatus.mutateAsync({ id, status: newStatus, competitionId });
      toast.success(`Updated to ${STATUS_LABELS[newStatus]}`);
      if (wasApproved && ["withdrawn", "rejected", "removed"].includes(newStatus)) {
        const waitlisted = registrations
          .filter((r) => r.status === "waitlist" && r.id !== id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const toPromote = (reg.division_id ? waitlisted.find((w) => w.division_id === reg.division_id) : null) || waitlisted[0];
        if (toPromote) {
          await updateStatus.mutateAsync({ id: toPromote.id, status: "approved", competitionId });
          toast.success(`${toPromote.athlete_name} promoted from waitlist`);
        }
      }
    } catch { toast.error("Update failed"); }
  };

  const handleExport = () => {
    const header = "Name,Email,Phone,Division,Team,Status,Type,Payment\n";
    const rows = registrations.map((r) => {
      const divName = divisions.find((d) => d.id === r.division_id)?.name ?? "";
      const teamName = teams.find((t) => t.id === r.team_id)?.team_name ?? "";
      return `"${r.athlete_name}","${r.email ?? ""}","${r.phone ?? ""}","${divName}","${teamName}","${r.status}","${r.registration_type}","${r.payment_status}"`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `athletes-${competitionId.slice(0, 8)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) { toast.error("CSV needs header + data rows"); return; }
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const nameIdx = header.findIndex((h) => ["name", "athlete_name", "athlete"].includes(h));
    if (nameIdx === -1) { toast.error("CSV must have a 'name' column"); return; }
    const emailIdx = header.findIndex((h) => ["email"].includes(h));
    const phoneIdx = header.findIndex((h) => ["phone"].includes(h));
    const genderIdx = header.findIndex((h) => ["gender", "sex"].includes(h));
    const divIdx = header.findIndex((h) => ["division", "div"].includes(h));
    const teamIdx = header.findIndex((h) => ["team"].includes(h));
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const name = cols[nameIdx];
      if (!name) continue;
      const divId = divIdx >= 0 ? divisions.find((d) => d.name.toLowerCase() === (cols[divIdx] || "").toLowerCase())?.id : null;
      const tId = teamIdx >= 0 ? teams.find((t) => t.team_name.toLowerCase() === (cols[teamIdx] || "").toLowerCase())?.id : null;
      try {
        await createReg.mutateAsync({
          competition_id: competitionId,
          athlete_name: name,
          division_id: divId || null,
          team_id: tId || null,
          registration_type: "organizer",
          status: "approved",
          email: emailIdx >= 0 ? cols[emailIdx] || null : null,
          phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          gender: genderIdx >= 0 ? cols[genderIdx] || null : null,
        });
        imported++;
      } catch { /* skip */ }
    }
    toast.success(`Imported ${imported} athlete(s)`);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      {canAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          {isMobile ? (
            <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
              <SheetTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground">
                  <UserPlus className="h-4 w-4 mr-1" /> Add
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
                <SheetHeader><SheetTitle>Add Athlete</SheetTitle></SheetHeader>
                <AddForm
                  {...{ newName, setNewName, newEmail, setNewEmail, newPhone, setNewPhone, newGender, setNewGender, newDob, setNewDob, newDivisionId, setNewDivisionId, newTeamId, setNewTeamId, divisions, teams }}
                  onSubmit={handleAddAthlete} isPending={createReg.isPending} onCancel={() => setShowAddForm(false)}
                />
              </SheetContent>
            </Sheet>
          ) : (
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="bg-primary text-primary-foreground">
              <UserPlus className="h-4 w-4 mr-1" /> Add Athlete
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowCreateTeam(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Team
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary">Bulk ({selectedIds.size}) <ChevronDown className="h-3 w-3 ml-1" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkAction("approved")}><CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Approve</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("rejected")}><XCircle className="h-4 w-4 mr-2 text-destructive" /> Reject</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("waitlist")}><Clock className="h-4 w-4 mr-2 text-blue-600" /> Waitlist</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction("removed")}><Trash2 className="h-4 w-4 mr-2 text-destructive" /> Remove</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-foreground">Team Name *</Label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Team Alpha"
                className="mt-1"
                maxLength={100}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
              />
            </div>
            {divisions.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-foreground">Division</Label>
                <Select value={newTeamDivisionId || "__none__"} onValueChange={(v) => setNewTeamDivisionId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Division</SelectItem>
                    {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {teams.length > 0 && (
              <div className="bg-muted/30 border border-border rounded-lg p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Existing Teams ({teams.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {teams.map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-[11px]">{t.team_name}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleCreateTeam} disabled={!newTeamName.trim() || addTeamMutation.isPending} className="flex-1 bg-accent text-accent-foreground">
                <Plus className="h-4 w-4 mr-1" /> Create Team
              </Button>
              <Button variant="ghost" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {showAddForm && canAdmin && !isMobile && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground uppercase mb-3">Add Athlete</h3>
          <AddForm
            {...{ newName, setNewName, newEmail, setNewEmail, newPhone, setNewPhone, newGender, setNewGender, newDob, setNewDob, newDivisionId, setNewDivisionId, newTeamId, setNewTeamId, divisions, teams }}
            onSubmit={handleAddAthlete} isPending={createReg.isPending} onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search athletes..." className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {REGISTRATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]} ({statusCounts[s] ?? 0})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {divisions.length > 0 && (
          <Select value={filterDivision} onValueChange={setFilterDivision}>
            <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Div.</SelectItem>
              {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{registrations.length === 0 ? "No athletes yet." : "No results match filters."}</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {canAdmin && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox checked={selectedIds.size === filtered.length} onCheckedChange={toggleSelectAll} />
              <span className="text-xs text-muted-foreground font-medium">{selectedIds.size > 0 ? `${selectedIds.size} selected` : `${filtered.length} athletes`}</span>
            </div>
          )}
          {filtered.map((r) => (
            <MobileCard
              key={r.id} reg={r} divisions={divisions} teams={teams} heats={heats}
              teamHeatMap={teamHeatMap} canAdmin={canAdmin}
              isSelected={selectedIds.has(r.id)} onToggle={() => toggleSelect(r.id)}
              onStatusChange={(s) => handleStatusChange(r.id, s, r)}
              onDivisionChange={(divId) => updateDivision.mutate({ id: r.id, divisionId: divId, competitionId }, { onSuccess: () => toast.success("Division updated"), onError: () => toast.error("Failed") })}
              onTeamChange={(tId) => updateTeam.mutate({ id: r.id, teamId: tId, competitionId }, { onSuccess: () => toast.success("Team updated"), onError: () => toast.error("Failed") })}
              onCreateTeam={() => setShowCreateTeam(true)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {canAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
              <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
              <span className="text-xs text-muted-foreground font-medium uppercase">{selectedIds.size > 0 ? `${selectedIds.size} selected` : `${filtered.length} athletes`}</span>
            </div>
          )}
          <div className="grid grid-cols-[1fr_130px_130px_110px_100px_40px] gap-3 px-5 py-2.5 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider border-b border-border bg-muted/20">
            <span>Athlete</span>
            <span>Division</span>
            <span>Team</span>
            <span>Status</span>
            <span>Heat / Lane</span>
            <span></span>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <DesktopRow
                key={r.id} reg={r} divisions={divisions} teams={teams}
                teamHeatMap={teamHeatMap} canAdmin={canAdmin}
                isSelected={selectedIds.has(r.id)} onToggle={() => toggleSelect(r.id)}
                onStatusChange={(s) => handleStatusChange(r.id, s, r)}
                onDivisionChange={(divId) => updateDivision.mutate({ id: r.id, divisionId: divId, competitionId }, { onSuccess: () => toast.success("Division updated"), onError: () => toast.error("Failed") })}
                onTeamChange={(tId) => updateTeam.mutate({ id: r.id, teamId: tId, competitionId }, { onSuccess: () => toast.success("Team updated"), onError: () => toast.error("Failed") })}
                onCreateTeam={() => setShowCreateTeam(true)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary stats — footer */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-primary" /> <strong className="text-foreground">{registrations.length}</strong> Total</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> <strong className="text-foreground">{approvedCount}</strong> Approved</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-yellow-600" /> <strong className="text-foreground">{statusCounts.pending ?? 0}</strong> Pending</span>
        {maxAthletes != null && (
          <span className="flex items-center gap-1 ml-auto"><strong className="text-foreground">{approvedCount}/{maxAthletes}</strong> Capacity</span>
        )}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-2.5 text-center">
      <div className="flex justify-center mb-0.5">{icon}</div>
      <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
    </div>
  );
}

// ── Add Form ──────────────────────────────────────────────
function AddForm({
  newName, setNewName, newEmail, setNewEmail, newPhone, setNewPhone,
  newGender, setNewGender, newDob, setNewDob, newDivisionId, setNewDivisionId,
  newTeamId, setNewTeamId, divisions, teams, onSubmit, isPending, onCancel,
}: {
  newName: string; setNewName: (v: string) => void;
  newEmail: string; setNewEmail: (v: string) => void;
  newPhone: string; setNewPhone: (v: string) => void;
  newGender: string; setNewGender: (v: string) => void;
  newDob: string; setNewDob: (v: string) => void;
  newDivisionId: string; setNewDivisionId: (v: string) => void;
  newTeamId: string; setNewTeamId: (v: string) => void;
  divisions: { id: string; name: string }[];
  teams: { id: string; team_name: string }[];
  onSubmit: () => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3 pt-2">
      <div>
        <Label className="text-xs font-medium">Name *</Label>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" className="mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs font-medium">Email</Label><Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@..." className="mt-1" /></div>
        <div><Label className="text-xs font-medium">Phone</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 234 567" className="mt-1" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Division</Label>
          <Select value={newDivisionId || "__none__"} onValueChange={(v) => setNewDivisionId(v === "__none__" ? "" : v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium">Team</Label>
          <Select value={newTeamId || "__none__"} onValueChange={(v) => setNewTeamId(v === "__none__" ? "" : v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>)}
            </SelectContent>
          </Select>
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
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSubmit} disabled={!newName.trim() || isPending} className="flex-1 bg-accent text-accent-foreground">Add Athlete</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Desktop Row ───────────────────────────────────────────
function DesktopRow({
  reg, divisions, teams, teamHeatMap, canAdmin, isSelected, onToggle,
  onStatusChange, onDivisionChange, onTeamChange, onCreateTeam,
}: {
  reg: AthleteRegistration;
  divisions: { id: string; name: string }[];
  teams: { id: string; team_name: string }[];
  teamHeatMap: Record<string, { heatNumber: number; lane: number | null }[]>;
  canAdmin: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onStatusChange: (s: string) => void;
  onDivisionChange: (id: string) => void;
  onTeamChange: (id: string) => void;
  onCreateTeam: () => void;
}) {
  const heatInfo = reg.team_id ? teamHeatMap[reg.team_id] : undefined;

  return (
    <div className={`grid grid-cols-[1fr_130px_130px_110px_100px_40px] gap-3 items-center px-5 py-3 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}>
      {/* Name */}
      <div className="flex items-center gap-2 min-w-0">
        {canAdmin && <Checkbox checked={isSelected} onCheckedChange={onToggle} />}
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">{reg.athlete_name}</span>
          {reg.email && <span className="text-[11px] text-muted-foreground truncate block">{reg.email}</span>}
        </div>
      </div>

      {/* Division */}
      {canAdmin && divisions.length > 0 ? (
        <Select value={reg.division_id || "__none__"} onValueChange={(v) => v !== "__none__" && onDivisionChange(v)}>
          <SelectTrigger className="h-7 text-[11px] border-dashed"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-xs text-muted-foreground truncate">{divisions.find((d) => d.id === reg.division_id)?.name ?? "—"}</span>
      )}

      {/* Team */}
      {canAdmin ? (
        teams.length > 0 ? (
          <Select value={reg.team_id || "__none__"} onValueChange={(v) => onTeamChange(v === "__none__" ? "" : v)}>
            <SelectTrigger className="h-7 text-[11px] border-dashed"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">No teams</span>
        )
      ) : (
        <span className="text-xs text-muted-foreground truncate">{teams.find((t) => t.id === reg.team_id)?.team_name ?? "—"}</span>
      )}

      {/* Status */}
      {canAdmin ? (
        <Select value={reg.status} onValueChange={(v) => onStatusChange(v)}>
          <SelectTrigger className={`h-7 text-[11px] border-0 ${STATUS_COLORS[reg.status] ?? ""}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGISTRATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Badge variant="outline" className={`text-[10px] justify-center ${STATUS_COLORS[reg.status] ?? ""}`}>
          {STATUS_LABELS[reg.status] ?? reg.status}
        </Badge>
      )}

      {/* Heat/Lane */}
      <div className="flex flex-wrap gap-1">
        {heatInfo && heatInfo.length > 0 ? (
          heatInfo.slice(0, 2).map((h, i) => (
            <Badge key={i} variant="outline" className="text-[9px] h-5 gap-0.5 bg-primary/5 border-primary/20">
              <Flame className="h-2.5 w-2.5" />
              H{h.heatNumber}{h.lane != null ? ` L${h.lane}` : ""}
            </Badge>
          ))
        ) : (
          <span className="text-[10px] text-muted-foreground italic">—</span>
        )}
      </div>

      {/* Actions */}
      {canAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {reg.status !== "approved" && <DropdownMenuItem onClick={() => onStatusChange("approved")}><CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Approve</DropdownMenuItem>}
            {reg.status !== "rejected" && <DropdownMenuItem onClick={() => onStatusChange("rejected")}><XCircle className="h-4 w-4 mr-2 text-destructive" /> Reject</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusChange("withdrawn")} className="text-destructive">Withdraw</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange("removed")} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ── Mobile Card ───────────────────────────────────────────
function MobileCard({
  reg, divisions, teams, heats, teamHeatMap, canAdmin, isSelected, onToggle,
  onStatusChange, onDivisionChange, onTeamChange, onCreateTeam,
}: {
  reg: AthleteRegistration;
  divisions: { id: string; name: string }[];
  teams: { id: string; team_name: string }[];
  heats: any[];
  teamHeatMap: Record<string, { heatNumber: number; lane: number | null }[]>;
  canAdmin: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onStatusChange: (s: string) => void;
  onDivisionChange: (id: string) => void;
  onTeamChange: (id: string) => void;
  onCreateTeam: () => void;
}) {
  const divName = divisions.find((d) => d.id === reg.division_id)?.name;
  const teamName = teams.find((t) => t.id === reg.team_id)?.team_name;
  const heatInfo = reg.team_id ? teamHeatMap[reg.team_id] : undefined;

  return (
    <div className={`bg-card border rounded-xl p-3 transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border"}`}>
      <div className="flex items-start gap-2">
        {canAdmin && <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{reg.athlete_name}</span>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[reg.status] ?? ""}`}>
              {STATUS_LABELS[reg.status] ?? reg.status}
            </Badge>
          </div>

          {/* Inline assignment selectors */}
          {canAdmin && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Select value={reg.division_id || "__none__"} onValueChange={(v) => v !== "__none__" && onDivisionChange(v)}>
                <SelectTrigger className="h-7 text-[11px] border-dashed"><SelectValue placeholder="Division" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Division</SelectItem>
                  {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={reg.team_id || "__none__"} onValueChange={(v) => onTeamChange(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-7 text-[11px] border-dashed"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Team</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {!canAdmin && (
            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
              {divName && <span>{divName}</span>}
              {teamName && <span>• {teamName}</span>}
            </div>
          )}

          {heatInfo && heatInfo.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {heatInfo.map((h, i) => (
                <Badge key={i} variant="outline" className="text-[9px] h-4 gap-0.5 bg-primary/5 border-primary/20">
                  <Flame className="h-2.5 w-2.5" /> H{h.heatNumber}{h.lane != null ? ` L${h.lane}` : ""}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {canAdmin && (
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-border">
          {reg.status !== "approved" && (
            <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1" onClick={() => onStatusChange("approved")}>
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> Approve
            </Button>
          )}
          {reg.status !== "rejected" && (
            <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1" onClick={() => onStatusChange("rejected")}>
              <XCircle className="h-3 w-3 mr-1 text-destructive" /> Reject
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange("waitlist")}>Waitlist</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("withdrawn")} className="text-destructive">Withdraw</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange("removed")} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Remove</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
