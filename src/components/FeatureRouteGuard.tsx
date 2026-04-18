import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import type { FeatureFlagKey } from "@/lib/featureFlags";

interface FeatureRouteGuardProps {
  flag: FeatureFlagKey;
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Redirects away if a feature flag is off (and the user isn't a super user).
 * Use to gate entire routes from direct URL access.
 */
export function FeatureRouteGuard({
  flag,
  children,
  redirectTo = "/dashboard",
}: FeatureRouteGuardProps) {
  const { enabled, loading } = useFeatureFlag(flag);
  if (loading) return null;
  if (!enabled) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
