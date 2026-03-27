import type { AuthUser, AuthenticatedUser } from "@/types";
import { apiFetch } from "@/services/api/client";

type Credentials = {
  username: string;
  password: string;
};

export function getSessionUser() {
  return apiFetch<{ user: AuthUser }>("/auth/me");
}

export function login(payload: Credentials) {
  return apiFetch<{ user: AuthenticatedUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: Credentials) {
  return apiFetch<{ user: AuthenticatedUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return apiFetch<void>("/auth/logout", {
    method: "POST",
  });
}

export function changePassword(payload: {
  currentPassword: string;
  nextPassword: string;
}) {
  return apiFetch<{ user: AuthenticatedUser }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePreferences(payload: {
  checklistEnforcementMode: AuthUser["checklistEnforcementMode"];
}) {
  return apiFetch<{ user: AuthenticatedUser }>("/auth/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
