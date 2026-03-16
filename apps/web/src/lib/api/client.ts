export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function getApiBaseUrl() {
  const rawBaseUrl = import.meta.env.VITE_API_URL as string | undefined;
  return rawBaseUrl ? rawBaseUrl.replace(/\/$/, "") : "";
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${input}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.error?.message || "Request failed.", response.status, payload?.error?.code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return payload as T;
}
