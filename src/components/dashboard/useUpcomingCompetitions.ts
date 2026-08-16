import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SpotlightCompetition {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  host_gym: string | null;
  type: string | null;
  divisions: string | null;
  poster_url: string | null;
}

const COLUMNS = "id, name, date, venue, host_gym, type, divisions, poster_url";

export function useUpcomingCompetitions(limit = 10) {
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["upcoming-competitions-spotlight", limit],
    queryFn: async () => {
      const { data: upcoming, error: upErr } = await supabase
        .from("competitions")
        .select(COLUMNS)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(limit);

      if (upErr) throw upErr;
      if (upcoming && upcoming.length > 0) return upcoming as SpotlightCompetition[];

      const { data: recent, error: reErr } = await supabase
        .from("competitions")
        .select(COLUMNS)
        .order("date", { ascending: false })
        .limit(limit);

      if (reErr) throw reErr;
      return (recent ?? []) as SpotlightCompetition[];
    },
  });
}

export const POSTER_GRADIENTS = [
  "from-primary/90 to-primary/30",
  "from-emerald-600/80 to-emerald-900/60",
  "from-amber-500/80 to-orange-700/60",
  "from-violet-600/80 to-indigo-900/60",
  "from-sky-500/80 to-blue-800/60",
];

export const POSTER_QUOTES = [
  "COMPETE.\nCONQUER.\nREPEAT.",
  "TRAIN\nHARDER\nTHAN YESTERDAY.",
  "STRENGTH\nHAS NO\nLIMIT.",
  "PUSH\nBEYOND\nYOUR BEST.",
  "RISE.\nGRIND.\nSHINE.",
];
