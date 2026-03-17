import type { TradeScreenshotAsset } from "@/lib/types";
import { ApiError, apiFetch } from "@/lib/api/client";

type PresignedUpload = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
};

type ScreenshotUpload = PresignedUpload & {
  storageKey: string;
  uploadToken: string;
  contentType: string;
  fileSize: number;
  maxFileSizeBytes: number;
  sortOrder: number;
};

export const TRADE_SCREENSHOT_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const TRADE_SCREENSHOT_ACCEPT = TRADE_SCREENSHOT_ALLOWED_TYPES.join(",");
export const MAX_TRADE_SCREENSHOT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export type ScreenshotMutationStage =
  | "validation"
  | "presign"
  | "upload"
  | "complete"
  | "delete";

export class ScreenshotUploadError extends Error {
  stage: ScreenshotMutationStage;
  code?: string;
  details?: unknown;

  constructor(stage: ScreenshotMutationStage, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ScreenshotUploadError";
    this.stage = stage;
    this.code = code;
    this.details = details;
  }
}

function isAllowedScreenshotType(file: File) {
  return TRADE_SCREENSHOT_ALLOWED_TYPES.includes(file.type as (typeof TRADE_SCREENSHOT_ALLOWED_TYPES)[number]);
}

function getStageMessage(stage: ScreenshotMutationStage, code?: string) {
  if (stage === "validation") {
    if (code === "INVALID_FILE_TYPE") {
      return "Use a PNG, JPEG, or WebP image.";
    }

    if (code === "FILE_TOO_LARGE") {
      return "Screenshots must be 10 MB or smaller.";
    }

    return "This screenshot file is not supported.";
  }

  if (stage === "presign") {
    if (code === "INVALID_FILE_TYPE") {
      return "Use a PNG, JPEG, or WebP image.";
    }

    if (code === "FILE_TOO_LARGE") {
      return "Screenshots must be 10 MB or smaller.";
    }

    return "Could not start the screenshot upload. Please try again.";
  }

  if (stage === "upload") {
    return "The screenshot file could not be uploaded. Please try again.";
  }

  if (stage === "complete") {
    if (code === "SCREENSHOT_UPLOAD_MISSING" || code === "SCREENSHOT_UPLOAD_INVALID" || code === "INVALID_UPLOAD_TOKEN") {
      return "The screenshot uploaded, but we could not attach it to this trade. Please try again.";
    }

    if (code === "SCREENSHOT_UPLOAD_ALREADY_COMPLETED") {
      return "This screenshot was already attached. Refresh and try again if it is missing.";
    }

    return "The screenshot uploaded, but we could not finish saving it. Please try again.";
  }

  return "Could not remove the screenshot. Please try again.";
}

export function validateTradeScreenshotFile(file: File) {
  if (!isAllowedScreenshotType(file)) {
    throw new ScreenshotUploadError("validation", getStageMessage("validation", "INVALID_FILE_TYPE"), "INVALID_FILE_TYPE");
  }

  if (file.size > MAX_TRADE_SCREENSHOT_FILE_SIZE_BYTES) {
    throw new ScreenshotUploadError("validation", getStageMessage("validation", "FILE_TOO_LARGE"), "FILE_TOO_LARGE");
  }
}

function normalizeScreenshotUploadError(stage: ScreenshotMutationStage, error: unknown) {
  if (error instanceof ScreenshotUploadError) {
    return error;
  }

  if (error instanceof ApiError) {
    return new ScreenshotUploadError(stage, getStageMessage(stage, error.code), error.code, error.details);
  }

  return new ScreenshotUploadError(stage, getStageMessage(stage), undefined, error);
}

export async function uploadTradeScreenshot(params: {
  tradeId: string;
  file: File;
  sortOrder: number;
}) {
  validateTradeScreenshotFile(params.file);

  let presigned: { upload: ScreenshotUpload };

  try {
    presigned = await apiFetch<{ upload: ScreenshotUpload }>(`/trades/${params.tradeId}/screenshots/presign`, {
      method: "POST",
      body: JSON.stringify({
        fileName: params.file.name,
        contentType: params.file.type,
        fileSize: params.file.size,
        sortOrder: params.sortOrder,
      }),
    });
  } catch (error) {
    throw normalizeScreenshotUploadError("presign", error);
  }

  const upload = presigned.upload;
  const uploadHeaders = new Headers(upload.headers ?? {});

  if (!uploadHeaders.has("Content-Type")) {
    uploadHeaders.set("Content-Type", params.file.type);
  }

  let uploadResponse: Response;

  try {
    uploadResponse = await fetch(upload.url, {
      method: upload.method,
      body: params.file,
      headers: uploadHeaders,
    });
  } catch (error) {
    throw normalizeScreenshotUploadError("upload", error);
  }

  if (!uploadResponse.ok) {
    throw new ScreenshotUploadError("upload", getStageMessage("upload"), "UPLOAD_FAILED");
  }

  let completed: { screenshot: TradeScreenshotAsset };

  try {
    completed = await apiFetch<{ screenshot: TradeScreenshotAsset }>(`/trades/${params.tradeId}/screenshots/complete`, {
      method: "POST",
      body: JSON.stringify({
        storageKey: upload.storageKey,
        uploadToken: upload.uploadToken,
        sortOrder: params.sortOrder,
      }),
    });
  } catch (error) {
    throw normalizeScreenshotUploadError("complete", error);
  }

  return completed.screenshot;
}

export async function deleteTradeScreenshot(tradeId: string, screenshotId: string) {
  try {
    return await apiFetch<void>(`/trades/${tradeId}/screenshots/${screenshotId}`, {
      method: "DELETE",
    });
  } catch (error) {
    throw normalizeScreenshotUploadError("delete", error);
  }
}

export function reorderTradeScreenshots(tradeId: string, screenshotIds: string[]) {
  return apiFetch<{ screenshots: TradeScreenshotAsset[] }>(`/trades/${tradeId}/screenshots/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ screenshotIds }),
  });
}
