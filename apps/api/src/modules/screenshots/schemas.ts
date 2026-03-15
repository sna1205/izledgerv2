import { z } from "zod";

export const screenshotTradeParamsSchema = z.object({
  id: z.string().uuid(),
});

export const screenshotParamsSchema = z.object({
  id: z.string().uuid(),
  screenshotId: z.string().uuid(),
});

export const presignScreenshotSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(255),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const completeScreenshotSchema = z.object({
  storageKey: z.string().trim().min(1),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const reorderScreenshotsSchema = z.object({
  screenshotIds: z.array(z.string().uuid()).min(1),
});
