import { ReactNode } from "react";
import { useTier } from "@/hooks/useTier";
import { useSuperUserAccess } from "@/hooks/useSuperUserAccess";
import NotFound from "@/pages/NotFound";

interface RequireTierProps {
  tier: string;
  children: ReactNode;
  fallback?: ReactNode;
  hide?: boolean;
}

export function RequireTier({ tier, children, fallback, hide = false }: RequireTierProps) {
  const { isAtLeast, loading: tierLoading } = useTier();
  const { isSuperUser, loading: superLoading } = useSuperUserAccess();

  if (tierLoading || superLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isSuperUser || isAtLeast(tier)) return <>{children}</>;
  if (hide) return null;
  return <>{fallback ?? <NotFound />}</>;
}
