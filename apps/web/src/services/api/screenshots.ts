import type { TradeScreenshotAsset } from "@/types";
import { ApiError, apiFetch } from "@/services/api/client";

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

const screenshotFileExtensionByType: Record<(typeof TRADE_SCREENSHOT_ALLOWED_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

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

function getClipboardReadErrorMessage(error: unknown) {
  if (typeof navigator === "undefined" || !navigator.clipboard || typeof navigator.clipboard.read !== "function") {
    return "Clipboard image paste is not supported in this browser.";
  }

  if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
    return "Clipboard permission denied. Allow clipboard access and try again.";
  }

  return "Could not read an image from your clipboard. Copy a screenshot first and try again.";
}

export async function readTradeScreenshotClipboardFiles() {
  if (typeof navigator === "undefined" || !navigator.clipboard || typeof navigator.clipboard.read !== "function") {
    throw new Error("Clipboard image paste is not supported in this browser.");
  }

  let clipboardItems: Array<{ types: readonly string[]; getType: (type: string) => Promise<Blob> }>;

  try {
    clipboardItems = await navigator.clipboard.read();
  } catch (error) {
    throw new Error(getClipboardReadErrorMessage(error));
  }

  const files: File[] = [];

  for (const [index, item] of clipboardItems.entries()) {
    const matchedType = TRADE_SCREENSHOT_ALLOWED_TYPES.find((type) => item.types.includes(type));

    if (!matchedType) {
      continue;
    }

    const blob = await item.getType(matchedType);
    const extension = screenshotFileExtensionByType[matchedType];

    files.push(new File([blob], `pasted-screenshot-${Date.now()}-${index + 1}.${extension}`, {
      type: matchedType,
      lastModified: Date.now(),
    }));
  }

  if (files.length === 0) {
    throw new Error("Clipboard does not contain a PNG, JPEG, or WebP image.");
  }

  return files;
}

async function completeTradeScreenshotUpload(params: {
  tradeId: string;
  upload: ScreenshotUpload;
  sortOrder: number;
}) {
  try {
    return await apiFetch<{ screenshot: TradeScreenshotAsset }>(`/trades/${params.tradeId}/screenshots/complete`, {
      method: "POST",
      body: JSON.stringify({
        storageKey: params.upload.storageKey,
        uploadToken: params.upload.uploadToken,
        sortOrder: params.sortOrder,
      }),
    });
  } catch (error) {
    throw normalizeScreenshotUploadError("complete", error);
  }
}

async function uploadTradeScreenshotViaApi(params: {
  tradeId: string;
  file: File;
  upload: ScreenshotUpload;
  sortOrder: number;
}) {
  try {
    return await apiFetch<{ screenshot: TradeScreenshotAsset }>(`/trades/${params.tradeId}/screenshots/upload`, {
      method: "POST",
      body: params.file,
      headers: {
        "Content-Type": params.file.type,
        "X-Storage-Key": params.upload.storageKey,
        "X-Upload-Token": params.upload.uploadToken,
        "X-Sort-Order": String(params.sortOrder),
      },
      timeoutMs: 30_000,
    });
  } catch (error) {
    const stage = error instanceof ApiError && [
      "INVALID_UPLOAD_TOKEN",
      "SCREENSHOT_UPLOAD_MISSING",
      "SCREENSHOT_UPLOAD_INVALID",
      "SCREENSHOT_UPLOAD_ALREADY_COMPLETED",
    ].includes(error.code ?? "")
      ? "complete"
      : "upload";

    throw normalizeScreenshotUploadError(stage, error);
  }
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
  } catch {
    const fallback = await uploadTradeScreenshotViaApi({
      tradeId: params.tradeId,
      file: params.file,
      upload,
      sortOrder: params.sortOrder,
    });

    return fallback.screenshot;
  }

  if (!uploadResponse.ok) {
    const fallback = await uploadTradeScreenshotViaApi({
      tradeId: params.tradeId,
      file: params.file,
      upload,
      sortOrder: params.sortOrder,
    });

    return fallback.screenshot;
  }

  const completed = await completeTradeScreenshotUpload({
    tradeId: params.tradeId,
    upload,
    sortOrder: params.sortOrder,
  });

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
