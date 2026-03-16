import { env } from "@/config/env";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers);

  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(input), {
    ...init,
    credentials: "include",
    headers: buildHeaders(init),
  });

  const payload = (await response.json().catch(() => null)) as T | ErrorPayload | null;

  if (!response.ok) {
    const errorPayload = payload as ErrorPayload | null;

    throw new ApiError(
      errorPayload?.error?.message || "Request failed.",
      response.status,
      errorPayload?.error?.code,
      errorPayload?.error?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return payload as T;
}
