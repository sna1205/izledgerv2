import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/api/client";
import {
  uploadTradeScreenshot,
  validateTradeScreenshotFile,
} from "@/services/api/screenshots";

const apiMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/services/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/services/api/client")>("@/services/api/client");

  return {
    ...actual,
    apiFetch: apiMocks.apiFetch,
  };
});

function createFile(name: string, type = "image/png", size = 1024) {
  const file = new File(["image"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("screenshot api helpers", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    apiMocks.apiFetch.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sanitizes backend presign failures", async () => {
    apiMocks.apiFetch.mockRejectedValueOnce(new ApiError("relation does not exist", 500, "INTERNAL_SERVER_ERROR"));

    await expect(uploadTradeScreenshot({
      tradeId: "trade-1",
      file: createFile("chart.png"),
      sortOrder: 0,
    })).rejects.toMatchObject({
      stage: "presign",
      message: "Could not start the screenshot upload. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("sanitizes storage upload failures", async () => {
    apiMocks.apiFetch.mockResolvedValueOnce({
      upload: {
        method: "PUT",
        url: "https://uploads.example.com/shot-1.png",
        storageKey: "screenshots/shot-1.png",
        uploadToken: "token-1",
        contentType: "image/png",
        fileSize: 1024,
        maxFileSizeBytes: 10 * 1024 * 1024,
        sortOrder: 0,
      },
    });
    apiMocks.apiFetch.mockResolvedValueOnce({
      screenshot: {
        id: "shot-1",
        storageKey: "screenshots/shot-1.png",
        url: "https://cdn.example.com/shot-1.png",
        sortOrder: 0,
        createdAt: new Date().toISOString(),
      },
    });
    fetchMock.mockResolvedValueOnce(new Response("", { status: 500 }));

    await expect(uploadTradeScreenshot({
      tradeId: "trade-1",
      file: createFile("chart.png"),
      sortOrder: 0,
    })).resolves.toMatchObject({
      id: "shot-1",
      storageKey: "screenshots/shot-1.png",
    });

    expect(apiMocks.apiFetch).toHaveBeenNthCalledWith(2, "/trades/trade-1/screenshots/upload", expect.objectContaining({
      method: "POST",
      body: expect.any(File),
      headers: expect.objectContaining({
        "Content-Type": "image/png",
        "X-Storage-Key": "screenshots/shot-1.png",
        "X-Upload-Token": "token-1",
        "X-Sort-Order": "0",
      }),
    }));
  });

  it("sanitizes completion failures after a successful upload", async () => {
    apiMocks.apiFetch
      .mockResolvedValueOnce({
        upload: {
          method: "PUT",
          url: "https://uploads.example.com/shot-1.png",
          storageKey: "screenshots/shot-1.png",
          uploadToken: "token-1",
          contentType: "image/png",
          fileSize: 1024,
          maxFileSizeBytes: 10 * 1024 * 1024,
          sortOrder: 0,
        },
      })
      .mockRejectedValueOnce(new ApiError("Upload token is invalid.", 400, "INVALID_UPLOAD_TOKEN"));
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));

    await expect(uploadTradeScreenshot({
      tradeId: "trade-1",
      file: createFile("chart.png"),
      sortOrder: 0,
    })).rejects.toMatchObject({
      stage: "complete",
      message: "The screenshot uploaded, but we could not attach it to this trade. Please try again.",
      code: "INVALID_UPLOAD_TOKEN",
    });
  });

  it("surfaces a user-friendly error when both direct and fallback uploads fail", async () => {
    apiMocks.apiFetch
      .mockResolvedValueOnce({
        upload: {
          method: "PUT",
          url: "https://uploads.example.com/shot-1.png",
          storageKey: "screenshots/shot-1.png",
          uploadToken: "token-1",
          contentType: "image/png",
          fileSize: 1024,
          maxFileSizeBytes: 10 * 1024 * 1024,
          sortOrder: 0,
        },
      })
      .mockRejectedValueOnce(new ApiError("storage blocked", 500, "INTERNAL_SERVER_ERROR"));
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(uploadTradeScreenshot({
      tradeId: "trade-1",
      file: createFile("chart.png"),
      sortOrder: 0,
    })).rejects.toMatchObject({
      stage: "upload",
      message: "The screenshot file could not be uploaded. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("rejects unsupported files before any upload request", () => {
    expect(() => validateTradeScreenshotFile(createFile("chart.gif", "image/gif"))).toThrow("Use a PNG, JPEG, or WebP image.");
    expect(apiMocks.apiFetch).not.toHaveBeenCalled();
  });
});
