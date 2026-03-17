import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { parseOrThrow } from "../../utils/http.js";
import { createTradeShareSchema, tradeShareListParamsSchema, tradeShareParamsSchema, tradeShareSettingsSchema } from "./schemas.js";
import { createOrUpdateTradeShare, getPublicTradeShare, listTradeShares, revokeTradeShare } from "./service.js";

export async function tradeShareRoutes(app: FastifyInstance) {
  app.post("/trades/:id/share", { preHandler: authenticate }, async (request, reply) => {
    const params = parseOrThrow(tradeShareListParamsSchema, request.params);
    const body = parseOrThrow(createTradeShareSchema, request.body);
    const share = await createOrUpdateTradeShare(request.auth!.userId, params.id, {
      settings: tradeShareSettingsSchema.parse(body.settings),
      expiresAt: body.expiresAt ?? null,
    });
    reply.status(201).send({ share });
  });

  app.get("/trades/:id/shares", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(tradeShareListParamsSchema, request.params);
    const items = await listTradeShares(request.auth!.userId, params.id);
    return { items };
  });

  app.patch("/shared/trade/:shareId/revoke", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(tradeShareParamsSchema, request.params);
    const share = await revokeTradeShare(request.auth!.userId, params.shareId);
    return { share };
  });

  app.get(
    "/shared/trade/:shareId",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const params = parseOrThrow(tradeShareParamsSchema, request.params);
      return getPublicTradeShare(params.shareId);
    },
  );
}
