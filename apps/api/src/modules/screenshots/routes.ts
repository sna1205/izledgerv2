import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { parseOrThrow } from "../../utils/http.js";
import { AppError } from "../../utils/errors.js";
import { maxScreenshotFileSizeBytes } from "./constants.js";
import {
  completeScreenshotSchema,
  presignScreenshotSchema,
  reorderScreenshotsSchema,
  screenshotParamsSchema,
  screenshotTradeParamsSchema,
  uploadScreenshotHeadersSchema,
} from "./schemas.js";
import {
  completeTradeScreenshot,
  deleteTradeScreenshot,
  presignTradeScreenshot,
  reorderTradeScreenshots,
  uploadTradeScreenshot,
} from "./service.js";

export async function screenshotRoutes(app: FastifyInstance) {
  app.addContentTypeParser(["image/png", "image/jpeg", "image/webp"], { parseAs: "buffer" }, (_request, body, done) => {
    done(null, body);
  });

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

  app.post("/:id/screenshots/upload", {
    preHandler: authenticate,
    bodyLimit: maxScreenshotFileSizeBytes,
  }, async (request, reply) => {
    const params = parseOrThrow(screenshotTradeParamsSchema, request.params);
    const headers = parseOrThrow(uploadScreenshotHeadersSchema, request.headers);

    if (!Buffer.isBuffer(request.body)) {
      throw new AppError(400, "BAD_REQUEST", "Invalid request");
    }

    const screenshot = await uploadTradeScreenshot(request.auth!.userId, params.id, {
      storageKey: headers["x-storage-key"],
      uploadToken: headers["x-upload-token"],
      contentType: headers["content-type"],
      sortOrder: headers["x-sort-order"] ?? 0,
      file: request.body,
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
