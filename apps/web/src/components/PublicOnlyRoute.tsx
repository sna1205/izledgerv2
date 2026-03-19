import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function PublicOnlyRoute() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
