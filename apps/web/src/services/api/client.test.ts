import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/services/api/client";

const originalFetch = global.fetch;

describe("apiFetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("does not attach a JSON content type when there is no body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    );
    global.fetch = fetchMock as typeof fetch;

    await apiFetch<void>("/auth/logout", {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(headers.get("Authorization")).toBe("Bearer token");
    expect(headers.has("Content-Type")).toBe(false);
    expect(init.credentials).toBe("include");
  });

  it("attaches a JSON content type when a JSON body exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    global.fetch = fetchMock as typeof fetch;

    await apiFetch<{ ok: boolean }>("/reviews", {
      method: "POST",
      body: JSON.stringify({ title: "Review" }),
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("normalizes network failures into ApiError", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as typeof fetch;

    await expect(apiFetch("/reviews")).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      code: "NETWORK_ERROR",
      message: "Failed to fetch",
    });
  });

  it("normalizes timeouts into ApiError", async () => {
    global.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    ) as typeof fetch;

    const request = apiFetch("/reviews", { timeoutMs: 50 });
    const expectation = expect(request).rejects.toMatchObject({
      name: "ApiError",
      status: 408,
      code: "REQUEST_TIMEOUT",
    });

    await vi.advanceTimersByTimeAsync(50);

    await expectation;
  });

  it("normalizes non-json http failures into ApiError", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("Gateway error", {
        status: 502,
        headers: {
          "Content-Type": "text/plain",
        },
      }),
    ) as typeof fetch;

    await expect(apiFetch("/reviews")).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      code: "HTTP_ERROR",
      message: "Gateway error",
    });
  });

  it("returns undefined for empty successful responses", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("", {
        status: 200,
      }),
    ) as typeof fetch;

    await expect(apiFetch<void>("/reviews/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("always includes cookies on API requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    global.fetch = fetchMock as typeof fetch;

    await apiFetch<{ ok: boolean }>("/auth/me");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
  });
});
