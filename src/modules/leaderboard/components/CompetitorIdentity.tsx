import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

/** team_id -> avatar url for solo competitor units (registration user's profile photo). */
export function useSoloAvatars(competitionId: string, soloTeamIds: string[]) {
  return useQuery({
    queryKey: ["solo-avatars", competitionId, soloTeamIds.join(",")],
    enabled: soloTeamIds.length > 0,
    queryFn: async () => {
      const { data: regs } = await supabase.from("athlete_registrations")
        .select("team_id, user_id").in("team_id", soloTeamIds);
      const userIds = [...new Set((regs ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
      if (!userIds.length) return {} as Record<string, string | null>;
      const { data: profs } = await supabase.from("profiles").select("user_id, avatar_url").in("user_id", userIds);
      const byUser = new Map((profs ?? []).map((p) => [p.user_id, p.avatar_url]));
      const out: Record<string, string | null> = {};
      for (const r of regs ?? []) if (r.team_id) out[r.team_id] = r.user_id ? byUser.get(r.user_id) ?? null : null;
      return out;
    },
  });
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function SoloIdentity({ name, avatarUrl, large }: { name: string; avatarUrl?: string | null; large?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar className={large ? "h-9 w-9" : "h-6 w-6"}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback className="text-[10px] font-semibold">{initials(name)}</AvatarFallback>
      </Avatar>
      <span>{name}</span>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase tracking-wide">Solo</Badge>
    </span>
  );
}
