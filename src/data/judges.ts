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
