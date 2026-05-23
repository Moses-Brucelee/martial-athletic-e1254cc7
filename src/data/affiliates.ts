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

/** Join the user (profile) to a gym as a member. */
export async function joinAffiliate(profileId: string, gymId: string): Promise<void> {
  const { error } = await supabase
    .from("gym_members")
    .insert({ gym_id: gymId, user_id: profileId, role: "member", status: "active" });
  if (error && (error as any).code !== "23505") throw error; // ignore duplicate
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
