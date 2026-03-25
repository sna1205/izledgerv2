import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/services/api/client";

function hasUnauthorizedError(errors: unknown[]) {
  return errors.some((error) => error instanceof ApiError && error.status === 401);
}

export function useUnauthorizedSessionGuard(...errors: unknown[]) {
  const { refreshSession, sessionState } = useAuth();
  const hasTriggeredRef = useRef(false);
  const shouldRefreshSession = hasUnauthorizedError(errors);

  useEffect(() => {
    if (typeof refreshSession !== "function") {
      return;
    }

    if (!shouldRefreshSession) {
      hasTriggeredRef.current = false;
      return;
    }

    if (sessionState === "loading" || hasTriggeredRef.current) {
      return;
    }

    hasTriggeredRef.current = true;
    void refreshSession();
  }, [refreshSession, sessionState, shouldRefreshSession]);
}
