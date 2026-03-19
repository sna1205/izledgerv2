import { env } from "@/config/env";

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildApiUrl(path: string) {
  const normalizedPath = normalizePath(path);

  if (!env.apiBaseUrl) {
    return normalizedPath;
  }

  return `${env.apiBaseUrl}${normalizedPath}`;
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(buildApiUrl(path), {
    credentials: "include",
    ...init,
  });
}
