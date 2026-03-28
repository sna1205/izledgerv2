import { z } from "zod";

const optionalNullableScopeIdSchema = z.string().uuid().optional().nullable();
const optionalNullableTextSchema = z.string().trim().max(2000).optional().nullable()
  .transform((value) => (value && value.length > 0 ? value : null));

export const checklistRuleParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listChecklistRulesQuerySchema = z.object({
  activeOnly: z.coerce.boolean().default(false),
  setupId: optionalNullableScopeIdSchema,
  accountId: optionalNullableScopeIdSchema,
  scopeMode: z.enum(["applicable", "exact"]).default("applicable"),
});

export const checklistRuleInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(160),
  description: optionalNullableTextSchema,
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
  setupId: optionalNullableScopeIdSchema,
  accountId: optionalNullableScopeIdSchema,
});

export const toggleChecklistRuleActiveSchema = z.object({
  isActive: z.boolean(),
});

export const reorderChecklistRulesSchema = z.object({
  ruleIds: z.array(z.string().uuid()).min(1),
});

export const checklistPreferenceSchema = z.object({
  checklistEnforcementMode: z.enum(["soft", "strict"]),
});
