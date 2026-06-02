import { supabase } from "@/integrations/supabase/client";

export interface AffiliateGym {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
}

/** List every gym in the system — used as the global affiliate picker. */
export async function fetchAllAffiliates(): Promise<AffiliateGym[]> {
  const { data, error } = await supabase
    .from("gyms")
    .select("id, name, slug, owner_id")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AffiliateGym[];
}

/** First gym the given profile id owns (returns null if they don't own one). */
export async function fetchUserOwnedGym(profileId: string): Promise<AffiliateGym | null> {
  const { data, error } = await supabase
    .from("gyms")
    .select("id, name, slug, owner_id")
    .eq("owner_id", profileId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as AffiliateGym | null) ?? null;
}

/**
 * All gyms a profile can create a competition for:
 * the gyms they own + the gyms they are an active member of.
 * Used by the competition wizard's affiliate picker.
 */
export async function fetchUserAccessibleGyms(profileId: string): Promise<AffiliateGym[]> {
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from("gyms").select("id, name, slug, owner_id").eq("owner_id", profileId),
    supabase
      .from("gym_members")
      .select("gym_id, gyms:gym_id (id, name, slug, owner_id)")
      .eq("user_id", profileId)
      .eq("status", "active"),
  ]);

  const byId = new Map<string, AffiliateGym>();
  for (const g of (owned ?? []) as AffiliateGym[]) byId.set(g.id, g);
  for (const row of (memberships ?? []) as any[]) {
    const g = row.gyms as AffiliateGym | null;
    if (g && !byId.has(g.id)) byId.set(g.id, g);
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Gym IDs the given profile is an active member of. */
export async function fetchUserAffiliateGymIds(profileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("gym_members")
    .select("gym_id")
    .eq("user_id", profileId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((r: any) => r.gym_id);
}

/** Returns { gym_id: status } for every membership row this profile has. */
export async function fetchUserAffiliationStatuses(
  profileId: string
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("gym_members")
    .select("gym_id, status")
    .eq("user_id", profileId);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as any[]) map[r.gym_id] = r.status;
  return map;
}

/** Request to join a gym (creates a pending membership for the current user). */
export async function requestAffiliation(gymId: string): Promise<{ status: string; id: string }> {
  const { data, error } = await (supabase as any).rpc("request_gym_affiliation", {
    p_gym_id: gymId,
  });
  if (error) throw error;
  return data as { status: string; id: string };
}

/** Owner accepts/rejects a pending gym member request. */
export async function respondToGymRequest(memberId: string, accept: boolean): Promise<void> {
  const { error } = await (supabase as any).rpc("respond_to_gym_request", {
    p_member_id: memberId,
    p_accept: accept,
  });
  if (error) throw error;
}

/** Invite an email to a gym. Auto-joins when that email signs up. */
export async function inviteAffiliateEmail(
  gymId: string,
  email: string,
  invitedBy: string
): Promise<{ id: string }> {
  const { data, error } = await (supabase as any)
    .from("gym_member_invitations")
    .insert({ gym_id: gymId, email: email.trim().toLowerCase(), invited_by: invitedBy })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function fetchPendingInvites(gymId: string): Promise<{ id: string; email: string; created_at: string }[]> {
  const { data, error } = await (supabase as any)
    .from("gym_member_invitations")
    .select("id, email, created_at")
    .eq("gym_id", gymId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function deleteInvite(id: string): Promise<void> {
  const { error } = await (supabase as any).from("gym_member_invitations").delete().eq("id", id);
  if (error) throw error;
}
