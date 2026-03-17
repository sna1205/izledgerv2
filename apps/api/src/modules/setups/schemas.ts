import { z } from "zod";
import { boundedIntSchema, numericBounds } from "../../utils/validation.js";

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

export const listSetupsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["all", "active", "archived"]).default("all"),
  page: boundedIntSchema(1, numericBounds.maxPage).default(1),
  pageSize: boundedIntSchema(1, numericBounds.maxPageSize).default(20),
  sortBy: z.enum(["createdAt", "name"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
