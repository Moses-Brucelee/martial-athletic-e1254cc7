import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";
import { addDivision, removeDivision } from "@/data/divisions";
import type { Division } from "@/domain/competition";

interface DivisionsPanelProps {
  competitionId: string;
  divisions: Division[];
  setDivisions: React.Dispatch<React.SetStateAction<Division[]>>;
  canAdmin: boolean;
}

export function DivisionsPanel({ competitionId, divisions, setDivisions, canAdmin }: DivisionsPanelProps) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const div = await addDivision(competitionId, newName.trim(), divisions.length);
      setDivisions((prev) => [...prev, div]);
      setNewName("");
    } catch {
      toast.error("Failed to add division");
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    try {
      await removeDivision(id);
      setDivisions((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error("Failed to remove division");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Divisions</h3>
      </div>

      {divisions.length === 0 && (
        <p className="text-sm text-muted-foreground mb-4">No divisions yet.</p>
      )}

      <div className="space-y-2 mb-4">
        {divisions.map((div) => (
          <div key={div.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background">
            <span className="font-semibold text-foreground text-sm">{div.name}</span>
            {canAdmin && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(div.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {canAdmin && (
        <div className="flex gap-2">
          <Input placeholder="Division name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9 bg-background text-sm flex-1" />
          <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground h-9">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
