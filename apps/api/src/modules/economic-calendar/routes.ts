import { FastifyInstance, FastifyRequest } from "fastify";
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
  const listHandler = async (request: FastifyRequest) => {
    const query = parseOrThrow(economicCalendarQuerySchema, request.query) as EconomicCalendarQuery;
    return listEconomicCalendarEvents(query);
  };

  const detailHandler = async (request: FastifyRequest) => {
    const params = parseOrThrow(economicCalendarDetailParamsSchema, request.params) as EconomicCalendarDetailParams;
    const query = parseOrThrow(economicCalendarDetailQuerySchema, request.query) as EconomicCalendarDetailQuery;
    return getEconomicCalendarEventDetail(params.eventId, query);
  };

  const nextEventHandler = async (request: FastifyRequest) => {
    const query = parseOrThrow(economicCalendarQuerySchema, request.query) as EconomicCalendarQuery;
    return getDashboardImportantEvents(query);
  };

  app.get("/economic-calendar", { preHandler: authenticate }, listHandler);
  app.get("/economic-calendar/events", { preHandler: authenticate }, listHandler);

  app.get("/economic-calendar/:eventId", { preHandler: authenticate }, detailHandler);
  app.get("/economic-calendar/events/:eventId", { preHandler: authenticate }, detailHandler);

  app.get("/dashboard/important-events", { preHandler: authenticate }, nextEventHandler);
  app.get("/economic-calendar/next-event", { preHandler: authenticate }, nextEventHandler);
}
