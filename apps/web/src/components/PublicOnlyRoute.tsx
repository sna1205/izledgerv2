import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function PublicOnlyRoute() {
  const { user, sessionState } = useAuth();

  if (sessionState === "loading") {
    return null;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
