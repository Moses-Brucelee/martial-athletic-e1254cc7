/**
 * V1 Full Access Mode
 * When true, all subscription/tier gating is bypassed.
 * Role-based access (owner, judge, viewer) remains enforced.
 * Set to false to re-enable subscription gating.
 */
export const V1_FULL_ACCESS = true;

/**
 * Feature Flag Registry
 *
 * Resolution priority (highest wins):
 *   1. DB row in `feature_flags` table (live, super-user editable)
 *   2. Vite env var: VITE_FF_<KEY> ("true" / "false")
 *   3. Code default (this file)
 *
 * Super users always see all features regardless of flag state.
 *
 * To add a new flag:
 *   1. Add entry below
 *   2. Insert row in `feature_flags` table (or it will use this default)
 *   3. Wrap UI with <FeatureGate flag="my_flag">...</FeatureGate>
 */
export type FeatureFlagKey =
  | "members_management"
  | "affiliation_network"
  | "gym_website_builder"
  | "performances_analytics"
  | "browse_marketplace"
  | "seasons"
  | "brackets"
  | "whiteboard_mode"
  | "competition_templates"
  | "share_qr_code"
  | "share_social_buttons"
  | "advanced_competition_setup";

export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  members_management: false,
  affiliation_network: false,
  gym_website_builder: false,
  performances_analytics: false,
  browse_marketplace: true,
  seasons: false,
  brackets: false,
  whiteboard_mode: true,
  competition_templates: true,
  share_qr_code: true,
  share_social_buttons: false,
  advanced_competition_setup: false,
};

export const FEATURE_FLAG_LABELS: Record<FeatureFlagKey, string> = {
  members_management: "Members management page (/members)",
  affiliation_network: "Gym affiliation network (/affiliation)",
  gym_website_builder: "Public gym website builder (/gym-website)",
  performances_analytics: "Athlete performance analytics (/performances)",
  browse_marketplace: "Browse competitions marketplace (/browse)",
  seasons: "Multi-competition season leaderboards",
  brackets: "Tournament bracket system",
  whiteboard_mode: "Full-screen leaderboard whiteboard mode",
  competition_templates: "Save and reuse competition templates",
  share_qr_code: "QR code sharing for competitions",
  share_social_buttons: "X / Facebook / LinkedIn share buttons",
  advanced_competition_setup: "Advanced competition creator (full workout builder)",
};


/**
 * Map menu_items.feature_key (DB) to a feature flag.
 * If a menu item maps to a flag that's off, the menu item is hidden.
 */
export const MENU_FEATURE_TO_FLAG: Record<string, FeatureFlagKey> = {
  members: "members_management",
  affiliation: "affiliation_network",
  gym_website: "gym_website_builder",
  performances: "performances_analytics",
  browse: "browse_marketplace",
};

/** Read the env-level default for a flag, if set. */
export function getEnvFlag(key: FeatureFlagKey): boolean | undefined {
  // Bulk default: if VITE_FF_DEFAULT is set, use it as fallback for all flags
  const bulkDefault = import.meta.env.VITE_FF_DEFAULT;
  const specific = import.meta.env[`VITE_FF_${key.toUpperCase()}`];

  if (specific === "true") return true;
  if (specific === "false") return false;
  if (bulkDefault === "true") return true;
  if (bulkDefault === "false") return false;
  return undefined;
}

/** Resolve a flag using env + code default (used before DB loads). */
export function resolveStaticFlag(key: FeatureFlagKey): boolean {
  const env = getEnvFlag(key);
  if (env !== undefined) return env;
  return FEATURE_FLAG_DEFAULTS[key];
}
