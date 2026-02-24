import type {
  DiscountContext,
  MemberDiscount,
  GymDefaultDiscount,
  AppliedDiscount,
  ResolvedDiscount,
} from "./discountResolver.types";

const CONTEXT_TO_TYPE: Record<DiscountContext, string[]> = {
  subscription: ["subscription", "promotional", "reward", "manual_override"],
  competition_entry: ["competition_entry", "promotional", "reward", "manual_override"],
  vendor_purchase: ["vendor", "promotional", "reward", "manual_override"],
};

function isValid(validFrom: string, validUntil: string | null, now: Date): boolean {
  const from = new Date(validFrom);
  if (from > now) return false;
  if (validUntil) {
    const until = new Date(validUntil);
    if (until <= now) return false;
  }
  return true;
}

/**
 * Stateless discount resolver.
 * - Merges member-specific + gym default discounts
 * - Filters by context and validity
 * - Compound stacking: 1 - ∏(1 - each%)
 * - Non-stackable: highest priority only
 * - Fixed amounts: summed separately
 */
export function resolveMemberDiscount(
  memberDiscounts: MemberDiscount[],
  gymDefaults: GymDefaultDiscount[],
  context: DiscountContext,
  now: Date = new Date()
): ResolvedDiscount {
  const allowedTypes = CONTEXT_TO_TYPE[context];

  // Build unified candidate list
  type Candidate = {
    id: string;
    source: "member" | "gym_default";
    type: string;
    percentage: number | null;
    amount: number | null;
    stackable: boolean;
    priority: number;
  };

  const candidates: Candidate[] = [];

  for (const d of memberDiscounts) {
    if (!allowedTypes.includes(d.discount_type)) continue;
    if (!isValid(d.valid_from, d.valid_until, now)) continue;
    candidates.push({
      id: d.id,
      source: "member",
      type: d.discount_type,
      percentage: d.discount_percentage,
      amount: d.discount_amount,
      stackable: d.is_stackable,
      priority: d.priority,
    });
  }

  for (const d of gymDefaults) {
    if (!allowedTypes.includes(d.discount_type)) continue;
    if (!isValid(d.valid_from, d.valid_until, now)) continue;
    candidates.push({
      id: d.id,
      source: "gym_default",
      type: d.discount_type,
      percentage: d.discount_percentage,
      amount: null,
      stackable: d.is_stackable,
      priority: d.priority,
    });
  }

  // Sort by priority ASC (lower = higher priority)
  candidates.sort((a, b) => a.priority - b.priority);

  const applied: AppliedDiscount[] = [];
  let compoundMultiplier = 1;
  let totalFixedAmount = 0;
  let bestNonStackable: Candidate | null = null;

  for (const c of candidates) {
    if (c.percentage != null) {
      if (c.stackable) {
        compoundMultiplier *= 1 - c.percentage / 100;
        applied.push(c);
      } else {
        // Take highest priority non-stackable (first encountered since sorted)
        if (!bestNonStackable) {
          bestNonStackable = c;
        }
      }
    }
    if (c.amount != null) {
      totalFixedAmount += c.amount;
      applied.push(c);
    }
  }

  // If there's a non-stackable percentage, compare it against compound stackable
  let finalPercentage: number;
  if (bestNonStackable && bestNonStackable.percentage != null) {
    const stackedPercentage = (1 - compoundMultiplier) * 100;
    if (bestNonStackable.percentage >= stackedPercentage) {
      // Non-stackable wins — replace applied percentage discounts
      finalPercentage = bestNonStackable.percentage;
      // Remove stackable percentage entries from applied, keep fixed amounts
      const fixedOnly = applied.filter((a) => a.amount != null);
      fixedOnly.push(bestNonStackable);
      applied.length = 0;
      applied.push(...fixedOnly);
    } else {
      finalPercentage = stackedPercentage;
    }
  } else {
    finalPercentage = (1 - compoundMultiplier) * 100;
  }

  // Cap at 100%
  finalPercentage = Math.min(Math.round(finalPercentage * 100) / 100, 100);

  return {
    finalPercentage,
    finalAmount: totalFixedAmount,
    appliedDiscounts: applied,
  };
}
