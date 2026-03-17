import { z } from "zod";

export const setupParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createSetupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).default(""),
  color: z.string().trim().regex(/^#([A-Fa-f0-9]{6})$/),
  isArchived: z.boolean().optional(),
});

export const updateSetupSchema = createSetupSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);
