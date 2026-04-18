import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import type { FeatureFlagKey } from "@/lib/featureFlags";

interface FeatureGateProps {
  flag: FeatureFlagKey;
  children: ReactNode;
  /** Shown when feature is hidden. If omitted, renders nothing. */
  fallback?: ReactNode;
  /** Show a "Hidden flag" badge next to children when super user is previewing. */
  showSuperUserBadge?: boolean;
}

/**
 * Conditionally renders children based on a feature flag.
 * Super users always see the content; an optional badge marks it as "preview".
 */
export function FeatureGate({
  flag,
  children,
  fallback = null,
  showSuperUserBadge = false,
}: FeatureGateProps) {
  const { enabled, loading, isSuperUserOverride } = useFeatureFlag(flag);

  if (loading) return null;
  if (!enabled) return <>{fallback}</>;

  if (isSuperUserOverride && showSuperUserBadge) {
    return (
      <div className="relative">
        <Badge
          variant="outline"
          className="absolute top-1 right-1 z-10 text-[10px] bg-background/80 backdrop-blur"
        >
          🚧 Hidden flag
        </Badge>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
