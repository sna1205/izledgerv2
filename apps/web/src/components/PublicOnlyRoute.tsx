import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function PublicOnlyRoute() {
  const { isReady, user } = useAuth();

  if (!isReady) {
    return null;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
