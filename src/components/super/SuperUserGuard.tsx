import { Navigate } from "react-router-dom";
import { useSuperUserAccess } from "@/hooks/useSuperUserAccess";

export function SuperUserGuard({ children }: { children: React.ReactNode }) {
  const { isSuperUser, loading } = useSuperUserAccess();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSuperUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
