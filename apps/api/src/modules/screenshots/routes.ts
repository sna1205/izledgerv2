import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { parseOrThrow } from "../../utils/http.js";
import { completeScreenshotSchema, presignScreenshotSchema, reorderScreenshotsSchema, screenshotParamsSchema, screenshotTradeParamsSchema } from "./schemas.js";
import { completeTradeScreenshot, deleteTradeScreenshot, presignTradeScreenshot, reorderTradeScreenshots } from "./service.js";

export async function screenshotRoutes(app: FastifyInstance) {
  app.post("/:id/screenshots/presign", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(screenshotTradeParamsSchema, request.params);
    const body = parseOrThrow(presignScreenshotSchema, request.body);
    const upload = await presignTradeScreenshot(request.auth!.userId, params.id, {
      ...body,
      sortOrder: body.sortOrder ?? 0,
    });
    return { upload };
  });

  app.post("/:id/screenshots/complete", { preHandler: authenticate }, async (request, reply) => {
    const params = parseOrThrow(screenshotTradeParamsSchema, request.params);
    const body = parseOrThrow(completeScreenshotSchema, request.body);
    const screenshot = await completeTradeScreenshot(request.auth!.userId, params.id, {
      ...body,
      sortOrder: body.sortOrder ?? 0,
    });
    reply.status(201).send({ screenshot });
  });

  app.patch("/:id/screenshots/reorder", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(screenshotTradeParamsSchema, request.params);
    const body = parseOrThrow(reorderScreenshotsSchema, request.body);
    const screenshots = await reorderTradeScreenshots(request.auth!.userId, params.id, body.screenshotIds);
    return { screenshots };
  });

  app.delete("/:id/screenshots/:screenshotId", { preHandler: authenticate }, async (request, reply) => {
    const params = parseOrThrow(screenshotParamsSchema, request.params);
    await deleteTradeScreenshot(request.auth!.userId, params.id, params.screenshotId);
    reply.status(204).send();
  });
}
