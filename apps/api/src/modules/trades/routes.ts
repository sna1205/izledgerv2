import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { parseOrThrow } from "../../utils/http.js";
import { createTradeSchema, listTradesQuerySchema, tradeParamsSchema, updateTradeSchema } from "./schemas.js";
import { createTrade, deleteTrade, getTrade, listTrades, updateTrade } from "./service.js";

export async function tradeRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: authenticate }, async (request) => {
    const query = parseOrThrow(listTradesQuerySchema, request.query);
    return listTrades(request.auth!.userId, {
      ...query,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      sortBy: query.sortBy ?? "date",
      sortOrder: query.sortOrder ?? "desc",
      includeDeleted: query.includeDeleted ?? false,
    });
  });

  app.post("/", { preHandler: authenticate }, async (request, reply) => {
    const body = parseOrThrow(createTradeSchema, request.body);
    const trade = await createTrade(request.auth!.userId, {
      ...body,
      notes: body.notes ?? "",
    });
    reply.status(201).send({ trade });
  });

  app.get("/:id", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(tradeParamsSchema, request.params);
    const trade = await getTrade(request.auth!.userId, params.id);
    return { trade };
  });

  app.patch("/:id", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(tradeParamsSchema, request.params);
    const body = parseOrThrow(updateTradeSchema, request.body);
    const trade = await updateTrade(request.auth!.userId, params.id, body);
    return { trade };
  });

  app.delete("/:id", { preHandler: authenticate }, async (request, reply) => {
    const params = parseOrThrow(tradeParamsSchema, request.params);
    await deleteTrade(request.auth!.userId, params.id);
    reply.status(204).send();
  });
}
