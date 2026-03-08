import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { divisionNameSchema } from "@/lib/validation";
import { useDivisions } from "@/modules/tournaments/hooks";
import { addDivision, removeDivision } from "@/modules/tournaments/api";
import { useQueryClient } from "@tanstack/react-query";

const DIVISION_PRESETS = [
  "RX Male",
  "RX Female",
  "Scaled Male",
  "Scaled Female",
  "Masters 35+",
];

interface DivisionsPanelProps {
  competitionId: string;
  canAdmin: boolean;
}

export function DivisionsPanel({ competitionId, canAdmin }: DivisionsPanelProps) {
  const { data: divisions = [], isLoading } = useDivisions(competitionId);
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async (name?: string) => {
    const divName = name || newName;
    const parsed = divisionNameSchema.safeParse(divName);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setAdding(true);
    try {
      await addDivision(competitionId, divName.trim(), divisions.length);
      qc.invalidateQueries({ queryKey: ["divisions", competitionId] });
      if (!name) setNewName("");
      toast.success("Division added!");
    } catch {
      toast.error("Failed to add division");
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    try {
      await removeDivision(id);
      qc.invalidateQueries({ queryKey: ["divisions", competitionId] });
      toast.success("Division removed");
    } catch {
      toast.error("Failed to remove division");
    }
  };

  const existingNames = divisions.map((d) => d.name.toLowerCase());
  const availablePresets = DIVISION_PRESETS.filter(
    (p) => !existingNames.includes(p.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Divisions</h3>
      </div>

      {/* Quick-add presets */}
      {canAdmin && availablePresets.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {availablePresets.map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-dashed"
                disabled={adding}
                onClick={() => handleAdd(preset)}
              >
                <Plus className="h-3 w-3 mr-1" /> {preset}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : divisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No divisions yet.</p>
      ) : (
        <div className="space-y-2">
          {divisions.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
              <span className="text-sm font-semibold text-foreground">{d.name}</span>
              {canAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(d.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canAdmin && (
        <div className="flex gap-2 mt-4">
          <Input placeholder="Division name" value={newName} onChange={(e) => setNewName(e.target.value)}
            className="bg-background flex-1 h-10 sm:h-9" maxLength={100} />
          <Button onClick={() => handleAdd()} disabled={adding || !newName.trim()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground h-10 sm:h-9">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
