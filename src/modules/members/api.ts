import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  Gym,
  GymMember,
  MemberDiscountRow,
  GymDefaultDiscountRow,
  CreateGymInput,
  CreateMemberDiscountInput,
  CreateGymDefaultDiscountInput,
} from "./types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    + "-" + Date.now().toString(36);
}

// ── Gyms ──────────────────────────────────────────────

export async function fetchUserGyms(profileId: string): Promise<Gym[]> {
  const { data, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("owner_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Gym[];
}

export async function createGym(profileId: string, input: CreateGymInput): Promise<Gym> {
  const { data, error } = await supabase
    .from("gyms")
    .insert({
      owner_id: profileId,
      name: input.name,
      slug: slugify(input.name),
      description: input.description ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Gym;
}

// ── Gym Members ───────────────────────────────────────

export async function fetchGymMembers(gymId: string): Promise<GymMember[]> {
  const { data, error } = await supabase
    .from("gym_members")
    .select("*, profiles!gym_members_user_id_fkey(display_name, avatar_url, full_name)")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
    const profile = row.profiles as Record<string, unknown> | null;
    return {
      id: row.id as string,
      gym_id: row.gym_id as string,
      user_id: row.user_id as string,
      role: row.role as string,
      belt_rank: row.belt_rank as string | null,
      join_date: row.join_date as string,
      status: row.status as string,
      team_assignment: row.team_assignment as string | null,
      metadata: row.metadata as Record<string, unknown> | null,
      created_at: row.created_at as string,
      display_name: (profile?.display_name as string) ?? null,
      avatar_url: (profile?.avatar_url as string) ?? null,
      full_name: (profile?.full_name as string) ?? null,
    };
  });
}

export async function addGymMember(gymId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("gym_members")
    .insert({ gym_id: gymId, user_id: userId });
  if (error) throw error;
}

export async function removeGymMember(memberId: string): Promise<void> {
  const { error } = await supabase.from("gym_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function updateGymMember(
  memberId: string,
  updates: Partial<Pick<GymMember, "role" | "belt_rank" | "status" | "team_assignment">>
): Promise<void> {
  const { error } = await supabase
    .from("gym_members")
    .update(updates as Record<string, unknown>)
    .eq("id", memberId);
  if (error) throw error;
}

// ── Member Discounts ──────────────────────────────────

export async function fetchMemberDiscounts(gymMemberId: string): Promise<MemberDiscountRow[]> {
  const { data, error } = await supabase
    .from("member_discounts")
    .select("*")
    .eq("gym_member_id", gymMemberId)
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MemberDiscountRow[];
}

export async function createMemberDiscount(
  input: CreateMemberDiscountInput,
  createdBy: string
): Promise<void> {
  const { error } = await supabase.from("member_discounts").insert([{
    gym_member_id: input.gym_member_id,
    discount_type: input.discount_type,
    source_type: input.source_type,
    discount_percentage: input.discount_percentage ?? null,
    discount_amount: input.discount_amount ?? null,
    is_stackable: input.is_stackable ?? false,
    priority: input.priority ?? 100,
    valid_until: input.valid_until ?? null,
    metadata: (input.metadata ?? null) as Json,
    created_by: createdBy,
  }]);
  if (error) throw error;
}

export async function deleteMemberDiscount(id: string): Promise<void> {
  const { error } = await supabase.from("member_discounts").delete().eq("id", id);
  if (error) throw error;
}

// ── Gym Default Discounts ─────────────────────────────

export async function fetchGymDefaultDiscounts(gymId: string): Promise<GymDefaultDiscountRow[]> {
  const { data, error } = await supabase
    .from("gym_default_discounts")
    .select("*")
    .eq("gym_id", gymId)
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as GymDefaultDiscountRow[];
}

export async function createGymDefaultDiscount(input: CreateGymDefaultDiscountInput): Promise<void> {
  const { error } = await supabase.from("gym_default_discounts").insert([{
    gym_id: input.gym_id,
    discount_type: input.discount_type,
    discount_percentage: input.discount_percentage,
    applies_to: input.applies_to ?? "all",
    is_stackable: input.is_stackable ?? false,
    priority: input.priority ?? 200,
    valid_until: input.valid_until ?? null,
    metadata: (input.metadata ?? null) as Json,
  }]);
  if (error) throw error;
}

export async function deleteGymDefaultDiscount(id: string): Promise<void> {
  const { error } = await supabase.from("gym_default_discounts").delete().eq("id", id);
  if (error) throw error;
}

// ── Profile Search (for adding members) ───────────────

export async function searchProfiles(query: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, display_name, avatar_url, full_name")
    .or(`display_name.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
