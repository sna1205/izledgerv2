import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/types";
import { ApiError } from "@/lib/api/client";
import {
  changePassword as changePasswordRequest,
  getSessionUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "@/lib/api/auth";

type AuthResult = Promise<{ error?: string }>;

interface AuthContextValue {
  isReady: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => AuthResult;
  register: (username: string, password: string) => AuthResult;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => AuthResult;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const sessionUserQueryKey = ["auth", "me"] as const;

function getApiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: sessionUserQueryKey,
    queryFn: async () => {
      try {
        const response = await getSessionUser();
        return response.user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }

        throw error;
      }
    },
    retry: false,
  });

  const contextValue: AuthContextValue = {
    isReady: !sessionQuery.isLoading,
    user: sessionQuery.data ?? null,
    login: async (username, password) => {
      if (!username.trim()) {
        return { error: "Username is required." };
      }

      if (!password.trim()) {
        return { error: "Password is required." };
      }

      try {
        const response = await loginRequest({
          username: username.trim(),
          password,
        });

        queryClient.setQueryData(sessionUserQueryKey, response.user);
        return {};
      } catch (error) {
        return { error: getApiErrorMessage(error, "Could not log in right now.") };
      }
    },
    register: async (username, password) => {
      if (!username.trim()) {
        return { error: "Username is required." };
      }

      if (!password.trim()) {
        return { error: "Password is required." };
      }

      try {
        const response = await registerRequest({
          username: username.trim(),
          password,
        });

        queryClient.setQueryData(sessionUserQueryKey, response.user);
        return {};
      } catch (error) {
        return { error: getApiErrorMessage(error, "Could not create your account right now.") };
      }
    },
    logout: async () => {
      try {
        await logoutRequest();
      } finally {
        queryClient.setQueryData(sessionUserQueryKey, null);
        queryClient.removeQueries({
          predicate: (query) => {
            const [scope] = query.queryKey;
            return scope !== "shared-trade" && scope !== "auth";
          },
        });
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

        queryClient.setQueryData(sessionUserQueryKey, response.user);
        return {};
      } catch (error) {
        return { error: getApiErrorMessage(error, "Could not update your password right now.") };
      }
    },
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
