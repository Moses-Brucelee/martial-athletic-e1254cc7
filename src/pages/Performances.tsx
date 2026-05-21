import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCompetitionHistory, useLinkedAthletes, useUpdateAthlete } from "@/modules/athletes/hooks";
import { AthleteClaimBanner } from "@/modules/athletes/components/AthleteClaimBanner";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  BarChart3, Trophy, Calendar, MapPin, ChevronRight,
  User, Medal, TrendingUp, Pencil
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/modules/athletes/types";
import { toast } from "sonner";
import type { Athlete } from "@/domain/competition";

export default function Performances() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: history = [], isLoading: histLoading } = useCompetitionHistory(user?.id);
  const { data: linkedAthletes = [] } = useLinkedAthletes(user?.id);
  const updateAthlete = useUpdateAthlete();

  const userEmail = user?.email;

  // Edit athlete state
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editDob, setEditDob] = useState("");

  const openEdit = (a: Athlete) => {
    setEditingAthlete(a);
    setEditName(a.name);
    setEditEmail(a.email ?? "");
    setEditPhone(a.phone ?? "");
    setEditGender(a.gender ?? "");
    setEditDob(a.date_of_birth ?? "");
  };

  const handleSaveAthlete = async () => {
    if (!editingAthlete || !editName.trim()) return;
    try {
      await updateAthlete.mutateAsync({
        athleteId: editingAthlete.id,
        updates: {
          name: editName.trim(),
          email: editEmail || null,
          phone: editPhone || null,
          gender: editGender || null,
          date_of_birth: editDob || null,
        },
      });
      toast.success("Athlete profile updated");
      setEditingAthlete(null);
    } catch {
      toast.error("Failed to update profile");
    }
  };

  // Stats
  const totalComps = history.length;
  const approvedComps = history.filter((h) => h.status === "approved" || h.status === "confirmed").length;
  const uniqueCompetitions = new Set(history.map((h) => h.competition_id)).size;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <AppHeader title="Performances" />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Athlete Profile Summary */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-foreground tracking-tight">
                {profile?.display_name || profile?.full_name || "Athlete"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {profile?.affiliation || "No affiliation"}
              </p>
              {linkedAthletes.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {linkedAthletes.length} linked athlete profile{linkedAthletes.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Claim Banner */}
        {userEmail && <AthleteClaimBanner userEmail={userEmail} />}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-black text-foreground">{uniqueCompetitions}</p>
            <p className="text-xs text-muted-foreground uppercase font-bold">Competitions</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Medal className="h-5 w-5 text-accent mx-auto mb-1" />
            <p className="text-2xl font-black text-foreground">{approvedComps}</p>
            <p className="text-xs text-muted-foreground uppercase font-bold">Confirmed</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-foreground">{totalComps}</p>
            <p className="text-xs text-muted-foreground uppercase font-bold">Registrations</p>
          </div>
        </div>

        {/* Competition History */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground uppercase">Competition History</h2>
          </div>

          {histLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No competition history yet.</p>
              <p className="text-xs text-muted-foreground">
                Register for competitions to build your athlete profile.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/browse")}>
                Browse Competitions
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => {
                const comp = entry.competitions;
                if (!comp) return null;

                const displayDate = comp.start_date
                  ? new Date(comp.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                  : null;

                return (
                  <button
                    key={entry.id}
                    onClick={() => navigate(`/event/${comp.id}/results`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors text-left"
                  >
                    {comp.poster_url ? (
                      <img
                        src={comp.poster_url}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{comp.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {displayDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />{displayDate}
                          </span>
                        )}
                        {comp.venue && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{comp.venue}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[entry.status] ?? ""}`}>
                      {STATUS_LABELS[entry.status] ?? entry.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Linked Athlete Profiles */}
        {linkedAthletes.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground uppercase mb-3">Linked Profiles</h2>
            <div className="space-y-2">
              {linkedAthletes.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.email && <span className="text-xs text-muted-foreground">{a.email}</span>}
                      {a.gender && <span className="text-xs text-muted-foreground capitalize">{a.gender}</span>}
                      {a.phone && <span className="text-xs text-muted-foreground">{a.phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(a)}
                      aria-label="Edit athlete"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Badge variant="secondary" className="text-xs">Linked</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Edit Athlete Sheet */}
      <Sheet open={!!editingAthlete} onOpenChange={(open) => !open && setEditingAthlete(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">Edit Athlete Profile</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-xs font-medium">Name *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1" maxLength={255} />
              </div>
              <div>
                <Label className="text-xs font-medium">Phone</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1" maxLength={20} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Gender</Label>
                <Select value={editGender || "__none__"} onValueChange={(v) => setEditGender(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not set</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Date of Birth</Label>
                <Input type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveAthlete}
                disabled={!editName.trim() || updateAthlete.isPending}
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {updateAthlete.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="ghost" onClick={() => setEditingAthlete(null)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
