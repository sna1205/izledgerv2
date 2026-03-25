import { z } from "zod";
import { accountTypes } from "../../config/domain.js";
import { nonnegativeMoneySchema, numericBounds } from "../../utils/validation.js";

export const accountParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listAccountsQuerySchema = z.object({
  status: z.enum(["all", "active", "archived"]).default("active"),
});

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  broker: z.string().trim().min(1).max(100),
  type: z.enum(accountTypes),
  balance: nonnegativeMoneySchema(numericBounds.maxAccountBalance),
  currency: z.string().trim().min(3).max(10),
  isDefault: z.boolean().optional(),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  isArchived: z.boolean().optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);
