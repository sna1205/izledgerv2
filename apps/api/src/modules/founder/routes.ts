import { FastifyInstance } from "fastify";
import { requireFounder } from "../../middleware/founder.js";
import { getFounderHealth, getFounderRecent, getFounderStats } from "./service.js";

export async function founderRoutes(app: FastifyInstance) {
  app.get("/stats", { preHandler: requireFounder }, async () => {
    return getFounderStats();
  });

  app.get("/recent", { preHandler: requireFounder }, async () => {
    return getFounderRecent();
  });

  app.get("/health", { preHandler: requireFounder }, async (request) => {
    return getFounderHealth(request.auth!.sessionId);
  });
}
