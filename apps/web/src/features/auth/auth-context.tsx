import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@/types";
import { ApiError } from "@/services/api/client";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_USERNAME_MAX_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
  validateAuthCredentials,
} from "@/utils/auth-validation";
import { clearPrivateQueryCache } from "@/services/query-client";
import {
  changePassword as changePasswordRequest,
  getSessionUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "@/services/api/auth";
import { withMinimumDelay } from "@/utils/loading";

type AuthResult = Promise<{ error?: string }>;
type SessionState = "loading" | "authenticated" | "anonymous" | "session-expired" | "backend-unavailable";

const LEGACY_AUTH_STORAGE_KEY = "izledger-auth-user";
const SESSION_EXPIRED_MESSAGE = "Your session expired. Please log in again.";
const SESSION_PERSISTENCE_MESSAGE = "We signed you in, but the session could not be verified. Please try again.";
const PASSWORD_CHANGE_SESSION_PERSISTENCE_MESSAGE = "Password updated, but the refreshed session could not be verified. Please log in again.";
const SESSION_CHECK_MAX_ATTEMPTS = 2;
const SESSION_CHECK_RETRY_DELAY_MS = 400;
const INVALID_CREDENTIALS_MESSAGE = "Incorrect username or password.";
type ApiValidationDetail = {
  field?: unknown;
  message?: unknown;
};

interface AuthContextValue {
  isReady: boolean;
  user: AuthUser | null;
  sessionState: SessionState;
  sessionMessage: string | null;
  login: (username: string, password: string) => AuthResult;
  register: (username: string, password: string) => AuthResult;
  logout: () => AuthResult;
  changePassword: (currentPassword: string, nextPassword: string) => AuthResult;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const sessionUserQueryKey = ["auth", "me"] as const;

function getApiErrorMessage(error: unknown, fallback: string) {
  const authMessage = getAuthErrorMessage(error);

  if (authMessage) {
    return authMessage;
  }

  const validationMessage = getValidationErrorMessage(error);

  if (validationMessage) {
    return validationMessage;
  }

  if (error instanceof ApiError && error.status >= 500) {
    return fallback;
  }

  return error instanceof ApiError ? error.message : fallback;
}

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return null;
  }

  if (error.code === "INVALID_CREDENTIALS" && error.status === 401) {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  return null;
}

function getValidationErrorMessage(error: unknown) {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR" || !Array.isArray(error.details)) {
    return null;
  }

  for (const detail of error.details) {
    const message = normalizeValidationDetailMessage(detail);

    if (message) {
      return message;
    }
  }

  return error.message;
}

function normalizeValidationDetailMessage(detail: unknown) {
  if (!detail || typeof detail !== "object") {
    return null;
  }

  const { field, message } = detail as ApiValidationDetail;

  if (field === "username") {
    if (typeof message === "string" && /at least/i.test(message)) {
      return `Username must be at least ${AUTH_USERNAME_MIN_LENGTH} characters.`;
    }

    if (typeof message === "string" && /at most/i.test(message)) {
      return `Username must be ${AUTH_USERNAME_MAX_LENGTH} characters or fewer.`;
    }

    if (typeof message === "string" && /required/i.test(message)) {
      return "Username is required.";
    }
  }

  if (field === "password") {
    if (typeof message === "string" && /at least/i.test(message)) {
      return `Password must be at least ${AUTH_PASSWORD_MIN_LENGTH} characters.`;
    }

    if (typeof message === "string" && /at most/i.test(message)) {
      return `Password must be ${AUTH_PASSWORD_MAX_LENGTH} characters or fewer.`;
    }

    if (typeof message === "string" && /required/i.test(message)) {
      return "Password is required.";
    }
  }

  return typeof message === "string" && message.trim() ? message : null;
}

function isTemporarySessionFailure(error: unknown) {
  if (error instanceof TypeError) {
    return true;
  }

  return error instanceof ApiError && (
    error.status === 0 ||
    error.status === 408 ||
    error.code === "NETWORK_ERROR" ||
    error.code === "REQUEST_TIMEOUT" ||
    error.code === "REQUEST_ABORTED"
  );
}

function getSessionUnavailableMessage(error: unknown) {
  if (isTemporarySessionFailure(error)) {
    return "IZLedger could not verify your session because the server is temporarily unavailable.";
  }

  return getApiErrorMessage(error, "IZLedger could not verify your session right now.");
}

function getLogoutErrorMessage(error: unknown) {
  if (isTemporarySessionFailure(error)) {
    return "Could not reach the server, so you are still logged in on this device.";
  }

  return getApiErrorMessage(error, "Could not log out right now. Your session is still active on this device.");
}

function clearLegacyStoredUser() {
  if (typeof window === "undefined") {
    return false;
  }

  const hadStoredUser = window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY) !== null;

  if (hadStoredUser) {
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  }

  return hadStoredUser;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function getSessionUserWithRetry() {
  for (let attempt = 1; attempt <= SESSION_CHECK_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await withMinimumDelay(() => getSessionUser());
    } catch (error) {
      const isLastAttempt = attempt >= SESSION_CHECK_MAX_ATTEMPTS;

      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }

      if (!isTemporarySessionFailure(error) || isLastAttempt) {
        throw error;
      }

      await delay(SESSION_CHECK_RETRY_DELAY_MS * attempt);
    }
  }

  throw new Error("Session bootstrap exhausted all retry attempts.");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const userRef = useRef<AuthUser | null>(null);

  const syncAuthenticatedUser = useCallback(async (nextUser: AuthUser, options?: { resetPrivateCache?: boolean }) => {
    const currentUserId = userRef.current?.id;

    if (options?.resetPrivateCache || (currentUserId && currentUserId !== nextUser.id)) {
      await clearPrivateQueryCache(queryClient);
    }

    userRef.current = nextUser;
    setUser(nextUser);
    setSessionState("authenticated");
    setSessionMessage(null);
    clearLegacyStoredUser();
    queryClient.setQueryData(sessionUserQueryKey, { user: nextUser });
  }, [queryClient]);

  const clearAuthenticatedUser = useCallback(async (
    nextState: Exclude<SessionState, "loading" | "authenticated">,
    nextMessage: string | null = null,
    options?: { resetPrivateCache?: boolean },
  ) => {
    if (options?.resetPrivateCache) {
      await clearPrivateQueryCache(queryClient);
    }

    userRef.current = null;
    setUser(null);
    setSessionState(nextState);
    setSessionMessage(nextMessage);
    clearLegacyStoredUser();
    queryClient.removeQueries({ queryKey: sessionUserQueryKey, exact: true });
  }, [queryClient]);

  const bootstrapSession = useCallback(async () => {
    clearLegacyStoredUser();
    const hadKnownUser = Boolean(userRef.current);

    try {
      const response = await getSessionUserWithRetry();
      await syncAuthenticatedUser(response.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearAuthenticatedUser(
          hadKnownUser ? "session-expired" : "anonymous",
          hadKnownUser ? SESSION_EXPIRED_MESSAGE : null,
          { resetPrivateCache: true },
        );
        return;
      }

      setSessionState("backend-unavailable");
      setSessionMessage(getSessionUnavailableMessage(error));
    }
  }, [clearAuthenticatedUser, syncAuthenticatedUser]);

  const verifyPersistedAuthenticatedSession = useCallback(async (
    fallbackUser: AuthUser,
    options?: {
      resetPrivateCache?: boolean;
      persistenceErrorMessage?: string;
    },
  ) => {
    try {
      const response = await getSessionUserWithRetry();
      await syncAuthenticatedUser(response.user ?? fallbackUser, options);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearAuthenticatedUser("anonymous", null, { resetPrivateCache: true });
        throw new ApiError(
          options?.persistenceErrorMessage ?? SESSION_PERSISTENCE_MESSAGE,
          401,
          "SESSION_NOT_PERSISTED",
        );
      }

      throw error;
    }
  }, [clearAuthenticatedUser, syncAuthenticatedUser]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  const contextValue: AuthContextValue = {
    isReady: sessionState !== "loading",
    user,
    sessionState,
    sessionMessage,
    login: async (username, password) => {
      const validationError = validateAuthCredentials(username, password);

      if (validationError) {
        return { error: validationError };
      }

      try {
        const response = await loginRequest({
          username: username.trim(),
          password,
        });

        await verifyPersistedAuthenticatedSession(response.user, {
          resetPrivateCache: true,
          persistenceErrorMessage: SESSION_PERSISTENCE_MESSAGE,
        });
        return {};
      } catch (error) {
        return { error: getApiErrorMessage(error, "Could not log in right now.") };
      }
    },
    register: async (username, password) => {
      const validationError = validateAuthCredentials(username, password);

      if (validationError) {
        return { error: validationError };
      }

      try {
        const response = await registerRequest({
          username: username.trim(),
          password,
        });

        await verifyPersistedAuthenticatedSession(response.user, {
          resetPrivateCache: true,
          persistenceErrorMessage: SESSION_PERSISTENCE_MESSAGE,
        });
        return {};
      } catch (error) {
        return { error: getApiErrorMessage(error, "Could not create your account right now.") };
      }
    },
    logout: async () => {
      try {
        await logoutRequest();
        await clearAuthenticatedUser("anonymous", null, { resetPrivateCache: true });
        return {};
      } catch (error) {
        return {
          error: getLogoutErrorMessage(error),
        };
      }
    },
    changePassword: async (currentPassword, nextPassword) => {
      if (!currentPassword.trim()) {
        return { error: "Current password is required." };
      }

      if (!nextPassword.trim()) {
        return { error: "New password is required." };
      }

      try {
        const response = await changePasswordRequest({
          currentPassword,
          nextPassword,
        });

        await verifyPersistedAuthenticatedSession(response.user, {
          persistenceErrorMessage: PASSWORD_CHANGE_SESSION_PERSISTENCE_MESSAGE,
        });
        return {};
      } catch (error) {
        return { error: getApiErrorMessage(error, "Could not update your password right now.") };
      }
    },
    refreshSession: bootstrapSession,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
