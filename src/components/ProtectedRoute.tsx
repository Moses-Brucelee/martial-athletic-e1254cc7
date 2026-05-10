import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { BottomNav } from "./BottomNav";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const intended = `${location.pathname}${location.search}${location.hash}`;
    const redirectParam = encodeURIComponent(intended);
    return <Navigate to={`/login?redirectTo=${redirectParam}`} replace />;
  }

  return (
    <>
      <div className="pb-16 md:pb-0">{children}</div>
      <BottomNav />
    </>
  );
}
