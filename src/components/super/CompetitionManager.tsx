import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Competition {
  id: string;
  name: string;
  status: string;
  created_by: string;
  created_at: string;
}

export function CompetitionManager() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("competitions")
      .select("id, name, status, created_by, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCompetitions(data);
      });
  }, []);

  const filtered = competitions.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search competitions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
            <div>
              <p className="font-semibold text-foreground text-sm">{c.name}</p>
              <p className="text-xs text-muted-foreground">Status: {c.status} • Created: {new Date(c.created_at).toLocaleDateString()}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate(`/competition/${c.id}`)}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
