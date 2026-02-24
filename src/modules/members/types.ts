export interface Gym {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Membership record joined with profile display data */
export interface GymMember {
  id: string;
  gym_id: string;
  user_id: string;
  role: string;
  belt_rank: string | null;
  join_date: string;
  status: string;
  team_assignment: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined from profiles — never stored in gym_members
  display_name: string | null;
  avatar_url: string | null;
  full_name: string | null;
}

export interface MemberDiscountRow {
  id: string;
  gym_member_id: string;
  discount_type: string;
  source_type: string;
  source_id: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  is_stackable: boolean;
  priority: number;
  valid_from: string;
  valid_until: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
}

export interface GymDefaultDiscountRow {
  id: string;
  gym_id: string;
  discount_type: string;
  discount_percentage: number;
  applies_to: string;
  is_stackable: boolean;
  priority: number;
  valid_from: string;
  valid_until: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateGymInput {
  name: string;
  description?: string;
}

export interface CreateMemberDiscountInput {
  gym_member_id: string;
  discount_type: string;
  source_type: string;
  discount_percentage?: number | null;
  discount_amount?: number | null;
  is_stackable?: boolean;
  priority?: number;
  valid_until?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateGymDefaultDiscountInput {
  gym_id: string;
  discount_type: string;
  discount_percentage: number;
  applies_to?: string;
  is_stackable?: boolean;
  priority?: number;
  valid_until?: string | null;
  metadata?: Record<string, unknown> | null;
}
