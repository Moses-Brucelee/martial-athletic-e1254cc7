import { supabase } from "@/integrations/supabase/client";
import type { Judge } from "@/domain/judges";

export async function fetchJudges(competitionId: string): Promise<Judge[]> {
  const { data, error } = await supabase
    .from("competition_judges")
    .select("*, profiles!competition_judges_user_id_fkey(display_name)")
    .eq("competition_id", competitionId);

  if (error) {
    const { data: fallback, error: fbErr } = await supabase
      .from("competition_judges")
      .select("*")
      .eq("competition_id", competitionId);
    if (fbErr) throw fbErr;
    return (fallback ?? []).map((row: any) => ({
      id: row.id,
      competition_id: row.competition_id,
      user_id: row.user_id,
      display_name: row.display_name ?? null,
      created_at: row.created_at,
    })) as Judge[];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    competition_id: row.competition_id,
    user_id: row.user_id,
    display_name: row.display_name || row.profiles?.display_name || null,
    created_at: row.created_at,
  })) as Judge[];
}

export async function addJudge(competitionId: string, userId: string): Promise<Judge> {
  const { data, error } = await supabase
    .from("competition_judges")
    .insert({ competition_id: competitionId, user_id: userId } as any)
    .select()
    .single();
  if (error) throw error;
  return data as Judge;
}

/** Add a guest judge by name only (no account). */
export async function addGuestJudge(competitionId: string, displayName: string): Promise<Judge> {
  const { data, error } = await (supabase as any)
    .from("competition_judges")
    .insert({ competition_id: competitionId, user_id: null, display_name: displayName.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Judge;
}

export async function removeJudge(judgeId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_judges")
    .delete()
    .eq("id", judgeId);
  if (error) throw error;
}

/**
 * Search registered athletes in a competition who have a user_id (registered users).
 * If `affiliateGymId` is provided, results are restricted to members of that gym.
 */
export async function searchRegisteredUsers(
  competitionId: string,
  query: string,
  affiliateGymId?: string | null
): Promise<{ user_id: string; athlete_name: string; display_name: string | null }[]> {
  const { data, error } = await supabase
    .from("athlete_registrations")
    .select("user_id, athlete_name")
    .eq("competition_id", competitionId)
    .not("user_id", "is", null)
    .ilike("athlete_name", `%${query}%`)
    .limit(20);

  if (error) throw error;
  const rows = (data ?? []) as any[];

  if (!affiliateGymId) {
    return rows.slice(0, 10).map((row) => ({
      user_id: row.user_id,
      athlete_name: row.athlete_name,
      display_name: row.athlete_name,
    }));
  }

  // Filter to users who are members of this affiliate gym.
  const userIds = rows.map((r) => r.user_id).filter(Boolean);
  if (userIds.length === 0) return [];

  // gym_members.user_id references profiles.id — map auth uid → profile id.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id")
    .in("user_id", userIds);
  const profileByUserId = new Map((profiles ?? []).map((p: any) => [p.user_id, p.id]));
  const profileIds = Array.from(profileByUserId.values());
  if (profileIds.length === 0) return [];

  const { data: members } = await supabase
    .from("gym_members")
    .select("user_id")
    .eq("gym_id", affiliateGymId)
    .in("user_id", profileIds);
  const memberProfileIds = new Set((members ?? []).map((m: any) => m.user_id));

  return rows
    .filter((r) => {
      const pid = profileByUserId.get(r.user_id);
      return pid && memberProfileIds.has(pid);
    })
    .slice(0, 10)
    .map((row) => ({
      user_id: row.user_id,
      athlete_name: row.athlete_name,
      display_name: row.athlete_name,
    }));
}

export async function findUserByEmail(email: string): Promise<{ user_id: string; display_name: string | null } | null> {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("user_id, display_name")
    .ilike("display_name", email)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface JudgeCandidate {
  user_id: string;
  display_name: string;
  source: "Athlete" | "Gym member";
}

/**
 * Search people connected to a competition: registered athletes with accounts
 * plus members of the competition's affiliate gym. Deduplicated by user_id.
 */
export async function searchJudgeCandidates(
  competitionId: string,
  query: string
): Promise<JudgeCandidate[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const { data: comp } = await supabase
    .from("competitions")
    .select("gym_id")
    .eq("id", competitionId)
    .maybeSingle();
  const gymId = (comp as any)?.gym_id ?? null;

  const results: JudgeCandidate[] = [];
  const seen = new Set<string>();

  // 1) Registered athletes with accounts
  try {
    const athletes = await searchRegisteredUsers(competitionId, q);
    for (const a of athletes) {
      if (!a.user_id || seen.has(a.user_id)) continue;
      seen.add(a.user_id);
      results.push({
        user_id: a.user_id,
        display_name: a.display_name || a.athlete_name,
        source: "Athlete",
      });
    }
  } catch {
    /* ignore — gym members may still match */
  }

  // 2) Members of the competition's affiliate gym
  if (gymId) {
    try {
      const { data: members } = await supabase
        .from("gym_members")
        .select("user_id")
        .eq("gym_id", gymId);
      const profileIds = Array.from(
        new Set(((members ?? []) as any[]).map((m) => m.user_id).filter(Boolean))
      );
      if (profileIds.length > 0) {
        const { data: profs } = await supabase
          .from("public_profiles")
          .select("id, user_id, display_name, full_name")
          .in("id", profileIds);
        for (const p of ((profs ?? []) as any[])) {
          const name: string = p.display_name || p.full_name || "";
          if (!p.user_id || !name) continue;
          if (!name.toLowerCase().includes(q.toLowerCase())) continue;
          if (seen.has(p.user_id)) continue;
          seen.add(p.user_id);
          results.push({ user_id: p.user_id, display_name: name, source: "Gym member" });
        }
      }
    } catch {
      /* ignore */
    }
  }

  return results.slice(0, 8);
}
