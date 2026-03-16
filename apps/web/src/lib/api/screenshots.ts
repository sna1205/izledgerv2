import type { TradeScreenshotAsset } from "@/lib/types";
import { apiFetch } from "@/lib/api/client";

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

export async function uploadTradeScreenshot(params: {
  tradeId: string;
  file: File;
  sortOrder: number;
}) {
  const presigned = await apiFetch<{ upload: ScreenshotUpload }>(`/trades/${params.tradeId}/screenshots/presign`, {
    method: "POST",
    body: JSON.stringify({
      fileName: params.file.name,
      contentType: params.file.type,
      fileSize: params.file.size,
      sortOrder: params.sortOrder,
    }),
  });

  const upload = presigned.upload;
  const uploadHeaders = new Headers(upload.headers ?? {});

  if (!uploadHeaders.has("Content-Type")) {
    uploadHeaders.set("Content-Type", params.file.type);
  }

  const uploadResponse = await fetch(upload.url, {
    method: upload.method,
    body: params.file,
    headers: uploadHeaders,
  });

  if (!uploadResponse.ok) {
    throw new Error("Screenshot upload failed.");
  }

  const completed = await apiFetch<{ screenshot: TradeScreenshotAsset }>(`/trades/${params.tradeId}/screenshots/complete`, {
    method: "POST",
    body: JSON.stringify({
      storageKey: upload.storageKey,
      uploadToken: upload.uploadToken,
      sortOrder: params.sortOrder,
    }),
  });

  return completed.screenshot;
}

export function deleteTradeScreenshot(tradeId: string, screenshotId: string) {
  return apiFetch<void>(`/trades/${tradeId}/screenshots/${screenshotId}`, {
    method: "DELETE",
  });
}

export function reorderTradeScreenshots(tradeId: string, screenshotIds: string[]) {
  return apiFetch<{ screenshots: TradeScreenshotAsset[] }>(`/trades/${tradeId}/screenshots/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ screenshotIds }),
  });
}
