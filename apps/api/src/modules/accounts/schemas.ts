import { z } from "zod";
import { accountTypes } from "../../config/domain.js";

export const accountParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  broker: z.string().trim().min(1).max(100),
  type: z.enum(accountTypes),
  balance: z.coerce.number(),
  currency: z.string().trim().min(3).max(10),
  isDefault: z.boolean().optional(),
});

export const updateAccountSchema = createAccountSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);
