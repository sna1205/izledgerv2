const defaultApiBaseUrl = import.meta.env.DEV ? "http://localhost:4000" : "";

function normalizeBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return defaultApiBaseUrl;
  }

  return trimmed.replace(/\/$/, "");
}

export const webEnv = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
};
