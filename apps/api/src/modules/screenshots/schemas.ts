import { z } from "zod";
import { boundedIntSchema, numericBounds } from "../../utils/validation.js";
import {
  allowedScreenshotContentTypes,
  getFileExtension,
  maxScreenshotFileSizeBytes,
  screenshotFileExtensionsByContentType,
} from "./constants.js";

export const screenshotTradeParamsSchema = z.object({
  id: z.string().uuid(),
});

export const screenshotParamsSchema = z.object({
  id: z.string().uuid(),
  screenshotId: z.string().uuid(),
});

export const presignScreenshotSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(allowedScreenshotContentTypes),
  fileSize: boundedIntSchema(1, maxScreenshotFileSizeBytes),
  sortOrder: boundedIntSchema(0, numericBounds.maxScreenshotSortOrder).default(0),
}).superRefine((value, ctx) => {
  const extension = getFileExtension(value.fileName);

  if (!extension) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fileName"],
      message: "Screenshot file name must include a supported file extension.",
    });
    return;
  }

  const allowedExtensions = screenshotFileExtensionsByContentType[value.contentType] as readonly string[];

  if (!allowedExtensions.includes(extension)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fileName"],
      message: `File extension must match ${value.contentType}.`,
    });
  }
});

export const completeScreenshotSchema = z.object({
  storageKey: z.string().trim().min(1),
  uploadToken: z.string().trim().min(1),
  sortOrder: boundedIntSchema(0, numericBounds.maxScreenshotSortOrder).default(0),
});

export const reorderScreenshotsSchema = z.object({
  screenshotIds: z.array(z.string().uuid()).min(1),
});
