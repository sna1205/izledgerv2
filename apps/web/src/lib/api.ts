import { webEnv } from "@/config/env";

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildApiUrl(path: string) {
  const normalizedPath = normalizePath(path);

  if (!webEnv.apiBaseUrl) {
    return normalizedPath;
  }

  return `${webEnv.apiBaseUrl}${normalizedPath}`;
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(buildApiUrl(path), {
    credentials: "include",
    ...init,
  });
}
