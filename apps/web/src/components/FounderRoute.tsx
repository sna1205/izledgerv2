import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { isFounderUser } from "@/lib/founder";

export function FounderRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isFounderUser(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
