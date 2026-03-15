import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { parseOrThrow } from "../../utils/http.js";
import { getAnalyticsBreakdowns, getAnalyticsCalendar, getDashboardSummary } from "./service.js";

const accountFilterSchema = z.object({
  accountId: z.string().uuid().optional(),
});

const calendarQuerySchema = accountFilterSchema.extend({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/dashboard/summary", { preHandler: authenticate }, async (request) => {
    const query = parseOrThrow(accountFilterSchema, request.query);
    const summary = await getDashboardSummary(request.auth!.userId, query.accountId);
    return summary;
  });

  app.get("/analytics/breakdowns", { preHandler: authenticate }, async (request) => {
    const query = parseOrThrow(accountFilterSchema, request.query);
    return getAnalyticsBreakdowns(request.auth!.userId, query.accountId);
  });

  app.get("/analytics/calendar", { preHandler: authenticate }, async (request) => {
    const query = parseOrThrow(calendarQuerySchema, request.query);
    return getAnalyticsCalendar(request.auth!.userId, query);
  });
}
