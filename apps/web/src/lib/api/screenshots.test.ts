import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  uploadTradeScreenshot,
  validateTradeScreenshotFile,
} from "@/lib/api/screenshots";

const apiMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");

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
    fetchMock.mockResolvedValueOnce(new Response("", { status: 500 }));

    await expect(uploadTradeScreenshot({
      tradeId: "trade-1",
      file: createFile("chart.png"),
      sortOrder: 0,
    })).rejects.toMatchObject({
      stage: "upload",
      message: "The screenshot file could not be uploaded. Please try again.",
      code: "UPLOAD_FAILED",
    });
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

  it("rejects unsupported files before any upload request", () => {
    expect(() => validateTradeScreenshotFile(createFile("chart.gif", "image/gif"))).toThrow("Use a PNG, JPEG, or WebP image.");
    expect(apiMocks.apiFetch).not.toHaveBeenCalled();
  });
});
