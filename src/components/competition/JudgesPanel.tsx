import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Gavel } from "lucide-react";
import { toast } from "sonner";
import { addJudge, removeJudge, findUserByEmail } from "@/data/judges";
import type { Judge } from "@/domain/judges";

interface JudgesPanelProps {
  competitionId: string;
  judges: Judge[];
  setJudges: React.Dispatch<React.SetStateAction<Judge[]>>;
  canAdmin: boolean;
}

export function JudgesPanel({ competitionId, judges, setJudges, canAdmin }: JudgesPanelProps) {
  const [searchEmail, setSearchEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!searchEmail.trim()) return;
    setAdding(true);
    try {
      const user = await findUserByEmail(searchEmail.trim());
      if (!user) {
        toast.error("User not found");
        setAdding(false);
        return;
      }
      const judge = await addJudge(competitionId, user.user_id);
      setJudges((prev) => [...prev, judge]);
      setSearchEmail("");
      toast.success(`Judge added: ${user.display_name || searchEmail}`);
    } catch {
      toast.error("Failed to add judge");
    }
    setAdding(false);
  };

  const handleRemove = async (judgeId: string) => {
    try {
      await removeJudge(judgeId);
      setJudges((prev) => prev.filter((j) => j.id !== judgeId));
    } catch {
      toast.error("Failed to remove judge");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Gavel className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Judges</h3>
      </div>

      {judges.length === 0 && (
        <p className="text-sm text-muted-foreground mb-4">No judges assigned.</p>
      )}

      <div className="space-y-2 mb-4">
        {judges.map((j) => (
          <div key={j.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background">
            <span className="font-semibold text-foreground text-sm truncate">{j.user_id}</span>
            {canAdmin && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(j.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {canAdmin && (
        <div className="flex gap-2">
          <Input placeholder="Search by display name" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} className="h-9 bg-background text-sm flex-1" />
          <Button size="sm" onClick={handleAdd} disabled={adding || !searchEmail.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground h-9">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
