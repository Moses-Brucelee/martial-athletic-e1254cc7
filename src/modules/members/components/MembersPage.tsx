import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserGyms, useCreateGym, useGymMembers, useAddMember, useRemoveMember, useSearchProfiles } from "../hooks";
import { MemberDetailSheet } from "./MemberDetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Users, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import type { GymMember } from "../types";
import { toast } from "sonner";
import { toast } from "sonner";

export default function MembersPage() {
  const navigate = useNavigate();
  const { data: gyms, isLoading: gymsLoading } = useUserGyms();
  const createGym = useCreateGym();

  const gym = gyms?.[0];
  const { data: members, isLoading: membersLoading } = useGymMembers(gym?.id);
  const addMember = useAddMember(gym?.id);
  const removeMember = useRemoveMember(gym?.id);

  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<GymMember | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create gym state
  const [gymName, setGymName] = useState("");
  const [gymDesc, setGymDesc] = useState("");

  // Add member state
  const [addOpen, setAddOpen] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const { data: profileResults } = useSearchProfiles(profileSearch);

  const filteredMembers = (members ?? []).filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.display_name?.toLowerCase().includes(q) ||
      m.full_name?.toLowerCase().includes(q) ||
      m.belt_rank?.toLowerCase().includes(q) ||
      m.status.toLowerCase().includes(q)
    );
  });

  const handleCreateGym = () => {
    if (!gymName.trim()) {
      toast.error("Enter a gym name");
      return;
    }
    createGym.mutate(
      { name: gymName.trim(), description: gymDesc.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Gym created!");
          setGymName("");
          setGymDesc("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleAddMember = (profileId: string) => {
    addMember.mutate(profileId, {
      onSuccess: () => {
        toast.success("Member added");
        setAddOpen(false);
        setProfileSearch("");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleRemoveMember = (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeMember.mutate(memberId, {
      onSuccess: () => toast.success("Member removed"),
      onError: (err) => toast.error(err.message),
    });
  };

  if (gymsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border bg-card">
          <Skeleton className="h-10 w-48" />
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12 space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </main>
      </div>
    );
  }

  // No gym yet — show create form
  if (!gym) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <img src={logoCompact} alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-lg font-bold text-foreground tracking-tight uppercase">Members</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <Users className="h-12 w-12 text-primary mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Create Your Gym</h2>
                <p className="text-sm text-muted-foreground">Set up your gym to start managing members.</p>
              </div>
              <div className="space-y-2">
                <Label>Gym Name</Label>
                <Input value={gymName} onChange={(e) => setGymName(e.target.value)} placeholder="e.g. Iron Phoenix MMA" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input value={gymDesc} onChange={(e) => setGymDesc(e.target.value)} placeholder="Brief description" />
              </div>
              <Button className="w-full" onClick={handleCreateGym} disabled={createGym.isPending}>
                {createGym.isPending ? "Creating..." : "Create Gym"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <img src={logoCompact} alt="Logo" className="w-10 h-10 object-contain" />
          <div>
            <span className="text-lg font-bold text-foreground tracking-tight uppercase">{gym.name}</span>
            <p className="text-xs text-muted-foreground">Member Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {/* Member count */}
        <p className="text-xs text-muted-foreground">
          {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""}
        </p>

        {/* Member list */}
        {membersLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No members found</p>
          </div>
        ) : (
          filteredMembers.map((m) => {
            const initials = (m.display_name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <button
                key={m.id}
                onClick={() => { setSelectedMember(m); setDetailOpen(true); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors text-left group"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{m.display_name || m.full_name || "Unknown"}</p>
                  <div className="flex gap-1.5 mt-0.5 flex-wrap">
                    {m.belt_rank && <Badge variant="outline" className="text-[10px] capitalize">{m.belt_rank}</Badge>}
                    <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-[10px] capitalize">{m.status}</Badge>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0"
                  onClick={(e) => handleRemoveMember(m.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </button>
            );
          })
        )}
      </main>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Search for an existing user to add to your gym.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search by name..."
            value={profileSearch}
            onChange={(e) => setProfileSearch(e.target.value)}
          />
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {profileSearch.length < 2 && (
              <p className="text-xs text-muted-foreground text-center py-4">Type at least 2 characters to search</p>
            )}
            {(profileResults ?? []).map((p) => {
              const alreadyMember = members?.some((m) => m.user_id === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-muted">{(p.display_name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{p.display_name || p.full_name || "Unknown"}</span>
                  </div>
                  {alreadyMember ? (
                    <Badge variant="secondary" className="text-xs">Already added</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleAddMember(p.id)} disabled={addMember.isPending}>
                      Add
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Detail Sheet */}
      <MemberDetailSheet
        member={selectedMember}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        gymId={gym.id}
      />
    </div>
  );
}
