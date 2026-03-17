import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layers, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { divisionNameSchema } from "@/lib/validation";
import { useDivisions } from "@/modules/tournaments/hooks";
import { addDivision, removeDivision } from "@/modules/tournaments/api";
import { useQueryClient } from "@tanstack/react-query";

const DIVISION_PRESETS = [
  "RX Male", "RX Female", "Scaled Male", "Scaled Female", "Masters 35+",
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
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setAdding(true);
    try {
      await addDivision(competitionId, divName.trim(), divisions.length);
      qc.invalidateQueries({ queryKey: ["divisions", competitionId] });
      if (!name) setNewName("");
      toast.success("Division added!");
    } catch { toast.error("Failed to add division"); }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    try {
      await removeDivision(id);
      qc.invalidateQueries({ queryKey: ["divisions", competitionId] });
      toast.success("Division removed");
    } catch { toast.error("Failed to remove division"); }
  };

  const existingNames = divisions.map((d) => d.name.toLowerCase());
  const availablePresets = DIVISION_PRESETS.filter((p) => !existingNames.includes(p.toLowerCase()));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Divisions</h3>
        <span className="text-xs text-muted-foreground">({divisions.length})</span>
      </div>

      {/* Active divisions as tags */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : divisions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No divisions yet. Use presets or add your own.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {divisions.map((d) => (
            <Badge
              key={d.id}
              variant="secondary"
              className="pl-2.5 pr-1 py-1 text-xs font-medium gap-1"
            >
              {d.name}
              {canAdmin && (
                <button
                  onClick={() => handleRemove(d.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Quick presets */}
      {canAdmin && availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availablePresets.map((preset) => (
            <button
              key={preset}
              disabled={adding}
              onClick={() => handleAdd(preset)}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              <Plus className="h-2.5 w-2.5" /> {preset}
            </button>
          ))}
        </div>
      )}

      {/* Custom input */}
      {canAdmin && (
        <div className="flex gap-2">
          <Input
            placeholder="Custom division…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && handleAdd()}
            className="bg-background flex-1 h-8 text-xs"
            maxLength={100}
          />
          <Button
            onClick={() => handleAdd()}
            disabled={adding || !newName.trim()}
            size="sm"
            className="bg-accent hover:bg-accent/90 text-accent-foreground h-8 px-3"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
