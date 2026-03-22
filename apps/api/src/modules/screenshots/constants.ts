export const allowedScreenshotContentTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const screenshotFileExtensionsByContentType = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
} as const;

export const maxScreenshotFileSizeBytes = 10 * 1024 * 1024;

export function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const extension = normalized.split(".").pop();

  if (!extension || extension === normalized) {
    return null;
  }

  return extension;
}

export function normalizeScreenshotContentType(contentType: string) {
  return contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}
