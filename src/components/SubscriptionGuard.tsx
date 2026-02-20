import { Navigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

interface SubscriptionGuardProps {
  requiredFeature: string;
  children: React.ReactNode;
}

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
    return <Navigate to="/upgrade" replace />;
  }

  return <>{children}</>;
}
