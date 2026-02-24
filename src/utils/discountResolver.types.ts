export type DiscountContext = "subscription" | "competition_entry" | "vendor_purchase";

export interface MemberDiscount {
  id: string;
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
}

export interface GymDefaultDiscount {
  id: string;
  discount_type: string;
  discount_percentage: number;
  applies_to: string;
  is_stackable: boolean;
  priority: number;
  valid_from: string;
  valid_until: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AppliedDiscount {
  id: string;
  source: "member" | "gym_default";
  type: string;
  percentage: number | null;
  amount: number | null;
  stackable: boolean;
  priority: number;
}

export interface ResolvedDiscount {
  finalPercentage: number;
  finalAmount: number;
  appliedDiscounts: AppliedDiscount[];
}
