import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { parseOrThrow } from "../../utils/http.js";
import { getDashboardImportantEvents, getEconomicCalendarEventDetail, listEconomicCalendarEvents } from "./service.js";
import {
  economicCalendarDetailParamsSchema,
  economicCalendarDetailQuerySchema,
  economicCalendarQuerySchema,
  type EconomicCalendarDetailParams,
  type EconomicCalendarDetailQuery,
  type EconomicCalendarQuery,
} from "./schemas.js";

export async function economicCalendarRoutes(app: FastifyInstance) {
  app.get("/economic-calendar", { preHandler: authenticate }, async (request) => {
    const query = parseOrThrow(economicCalendarQuerySchema, request.query) as EconomicCalendarQuery;
    return listEconomicCalendarEvents(query);
  });

  app.get("/economic-calendar/:eventId", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(economicCalendarDetailParamsSchema, request.params) as EconomicCalendarDetailParams;
    const query = parseOrThrow(economicCalendarDetailQuerySchema, request.query) as EconomicCalendarDetailQuery;
    return getEconomicCalendarEventDetail(params.eventId, query);
  });

  app.get("/dashboard/important-events", { preHandler: authenticate }, async (request) => {
    const query = parseOrThrow(economicCalendarQuerySchema, request.query) as EconomicCalendarQuery;
    return getDashboardImportantEvents(query);
  });
}
