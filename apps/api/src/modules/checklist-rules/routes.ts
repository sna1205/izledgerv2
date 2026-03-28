import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { parseOrThrow } from "../../utils/http.js";
import {
  checklistRuleInputSchema,
  checklistRuleParamsSchema,
  listChecklistRulesQuerySchema,
  reorderChecklistRulesSchema,
  toggleChecklistRuleActiveSchema,
} from "./schemas.js";
import {
  createChecklistRule,
  deleteChecklistRule,
  listChecklistRules,
  reorderChecklistRules,
  toggleChecklistRuleActive,
  updateChecklistRule,
} from "./service.js";

export async function checklistRuleRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: authenticate }, async (request) => {
    const query = parseOrThrow(listChecklistRulesQuerySchema, request.query);
    return listChecklistRules(request.auth!.userId, {
      activeOnly: query.activeOnly ?? false,
      setupId: query.setupId,
      accountId: query.accountId,
      scopeMode: query.scopeMode,
    });
  });

  app.post("/", { preHandler: authenticate }, async (request, reply) => {
    const body = parseOrThrow(checklistRuleInputSchema, request.body);
    const rule = await createChecklistRule(request.auth!.userId, {
      ...body,
      isRequired: body.isRequired ?? false,
      isActive: body.isActive ?? true,
    });
    reply.status(201).send({ rule });
  });

  app.put("/:id", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(checklistRuleParamsSchema, request.params);
    const body = parseOrThrow(checklistRuleInputSchema, request.body);
    const rule = await updateChecklistRule(request.auth!.userId, params.id, {
      ...body,
      isRequired: body.isRequired ?? false,
      isActive: body.isActive ?? true,
    });
    return { rule };
  });

  app.delete("/:id", { preHandler: authenticate }, async (request, reply) => {
    const params = parseOrThrow(checklistRuleParamsSchema, request.params);
    await deleteChecklistRule(request.auth!.userId, params.id);
    reply.status(204).send();
  });

  app.patch("/:id/toggle-active", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(checklistRuleParamsSchema, request.params);
    const body = parseOrThrow(toggleChecklistRuleActiveSchema, request.body);
    const rule = await toggleChecklistRuleActive(request.auth!.userId, params.id, body.isActive);
    return { rule };
  });

  app.patch("/reorder", { preHandler: authenticate }, async (request) => {
    const body = parseOrThrow(reorderChecklistRulesSchema, request.body);
    return reorderChecklistRules(request.auth!.userId, body.ruleIds);
  });
}
