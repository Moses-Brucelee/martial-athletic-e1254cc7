import { useSubscription } from "@/hooks/useSubscription";
import NotFound from "@/pages/NotFound";

interface SubscriptionGuardProps {
  requiredFeature: string;
  children: React.ReactNode;
}

/**
 * Renders children only when the current user has access to the required
 * feature. In the MVP we never expose upgrade flows to end users, so a
 * lacking subscription resolves to NotFound (consistent with RequireTier).
 */
export function SubscriptionGuard({ requiredFeature, children }: SubscriptionGuardProps) {
  const { canAccess, loading } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canAccess(requiredFeature)) {
    return <NotFound />;
  }

  return <>{children}</>;
}
