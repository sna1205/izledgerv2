import { env } from "@/config/env";

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const NETWORK_ERROR_CODE = "NETWORK_ERROR";
const REQUEST_TIMEOUT_CODE = "REQUEST_TIMEOUT";
const REQUEST_ABORTED_CODE = "REQUEST_ABORTED";
const HTTP_ERROR_CODE = "HTTP_ERROR";
const INVALID_RESPONSE_CODE = "INVALID_RESPONSE";
const API_REQUEST_CREDENTIALS: RequestCredentials = "include";

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
  code?: string;
  message?: string;
  details?: unknown;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export type ApiRequestInit = RequestInit & {
  timeoutMs?: number;
};

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function hasJsonBody(body: BodyInit | null | undefined) {
  return typeof body === "string";
}

function buildHeaders(init?: ApiRequestInit) {
  const headers = new Headers(init?.headers);

  if (hasJsonBody(init?.body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

function createAbortSignal(signal: AbortSignal | null | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let didTimeout = false;

  const abortFromSignal = () => {
    controller.abort(signal?.reason);
  };

  if (signal?.aborted) {
    abortFromSignal();
  } else if (signal) {
    signal.addEventListener("abort", abortFromSignal, { once: true });
  }

  const timeoutId = globalThis.setTimeout(() => {
    didTimeout = true;
    controller.abort(new DOMException("The request timed out.", "TimeoutError"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => didTimeout,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortFromSignal);
    },
  };
}

function getErrorPayloadDetails(payload: ErrorPayload | null) {
  const message = payload?.error?.message || payload?.message;
  const code = payload?.error?.code || payload?.code;
  const details = payload?.error?.details ?? payload?.details;

  return { message, code, details };
}

function normalizeThrownError(error: unknown, didTimeout: boolean) {
  if (error instanceof ApiError) {
    return error;
  }

  if (didTimeout) {
    return new ApiError("The request timed out. Please try again.", 408, REQUEST_TIMEOUT_CODE);
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError("The request was cancelled.", 0, REQUEST_ABORTED_CODE);
  }

  if (error instanceof Error) {
    return new ApiError(error.message || "Network request failed.", 0, NETWORK_ERROR_CODE);
  }

  return new ApiError("Network request failed.", 0, NETWORK_ERROR_CODE);
}

async function parseResponse(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return { hasBody: false, isJson: false, data: null as unknown, rawText: "" };
  }

  const rawText = await response.text();

  if (!rawText) {
    return { hasBody: false, isJson: false, data: null as unknown, rawText };
  }

  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
  const isJson = contentType.includes("application/json") || contentType.includes("+json");

  if (!isJson) {
    return { hasBody: true, isJson: false, data: rawText, rawText };
  }

  try {
    return {
      hasBody: true,
      isJson: true,
      data: JSON.parse(rawText) as unknown,
      rawText,
    };
  } catch {
    throw new ApiError(
      "The server returned an invalid response.",
      response.status,
      INVALID_RESPONSE_CODE,
      { contentType, responseBody: rawText },
    );
  }
}

export async function apiFetch<T>(input: string, init?: ApiRequestInit): Promise<T> {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, signal: callerSignal, ...requestInit } = init ?? {};
  const requestAbort = createAbortSignal(callerSignal, timeoutMs);
  let response: Response;

  try {
    response = await fetch(buildUrl(input), {
      ...requestInit,
      credentials: API_REQUEST_CREDENTIALS,
      headers: buildHeaders(init),
      signal: requestAbort.signal,
    });
  } catch (error) {
    throw normalizeThrownError(error, requestAbort.didTimeout());
  } finally {
    requestAbort.cleanup();
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    if (payload.isJson) {
      const errorPayload = payload.data as ErrorPayload | null;
      const normalized = getErrorPayloadDetails(errorPayload);

      throw new ApiError(
        normalized.message || "Request failed.",
        response.status,
        normalized.code || HTTP_ERROR_CODE,
        normalized.details,
      );
    }

    throw new ApiError(
      typeof payload.data === "string" && payload.data.trim() ? payload.data : "Request failed.",
      response.status,
      HTTP_ERROR_CODE,
      typeof payload.data === "string" ? { responseBody: payload.data } : undefined,
    );
  }

  if (!payload.hasBody) {
    return undefined as T;
  }

  if (!payload.isJson) {
    throw new ApiError(
      "The server returned an invalid response.",
      response.status,
      INVALID_RESPONSE_CODE,
      { responseBody: payload.rawText },
    );
  }

  return payload.data as T;
}
