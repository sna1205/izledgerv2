import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute() {
  const { user, sessionMessage, sessionState, refreshSession } = useAuth();
  const location = useLocation();

  if (!user && sessionState === "backend-unavailable") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md space-y-4 rounded-2xl border bg-background p-6 text-center shadow-sm">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-foreground">Unable to verify your session</h1>
            <p className="text-sm text-muted-foreground">
              {sessionMessage || "IZLedger could not reach the server right now. Please try again in a moment."}
            </p>
          </div>
          <Button type="button" onClick={() => void refreshSession()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          authMessage: sessionState === "session-expired" ? sessionMessage : null,
        }}
      />
    );
  }

  return <Outlet />;
}
