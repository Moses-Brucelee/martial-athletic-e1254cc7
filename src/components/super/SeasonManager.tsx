import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Season {
  id: string;
  name: string;
  year: number;
}

export function SeasonManager() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    supabase
      .from("seasons")
      .select("*")
      .order("year", { ascending: false })
      .then(({ data }) => {
        if (data) setSeasons(data);
      });
  }, []);

  const handleAdd = async () => {
    if (!newName.trim() || !newYear) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("seasons")
      .insert({ name: newName.trim(), year: parseInt(newYear) })
      .select()
      .single();

    if (error) toast.error("Failed to create season");
    else if (data) {
      setSeasons((prev) => [data, ...prev]);
      setNewName("");
      toast.success("Season created");
    }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("seasons").delete().eq("id", id);
    if (error) toast.error("Failed to delete season");
    else setSeasons((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Season name" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-background flex-1" />
        <Input type="number" placeholder="Year" value={newYear} onChange={(e) => setNewYear(e.target.value)} className="bg-background w-24" />
        <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {seasons.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">{s.name} ({s.year})</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(s.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
