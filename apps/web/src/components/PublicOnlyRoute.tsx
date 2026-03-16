import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function PublicOnlyRoute() {
  const { isReady, user } = useAuth();

  if (!isReady) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading session...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
