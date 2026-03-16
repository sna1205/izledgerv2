import type { AuthUser } from "@/lib/types";
import { apiFetch } from "@/lib/api/client";

type Credentials = {
  username: string;
  password: string;
};

export function getSessionUser() {
  return apiFetch<{ user: AuthUser }>("/auth/me");
}

export function login(payload: Credentials) {
  return apiFetch<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: Credentials) {
  return apiFetch<{ user: AuthUser }>("/auth/register", {
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
  return apiFetch<{ user: AuthUser }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
