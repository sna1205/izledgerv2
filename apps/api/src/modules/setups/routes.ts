import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { parseOrThrow } from "../../utils/http.js";
import { createSetupSchema, setupParamsSchema, updateSetupSchema } from "./schemas.js";
import { createSetup, deleteSetup, listSetups, updateSetup } from "./service.js";

export async function setupRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: authenticate }, async (request) => {
    const items = await listSetups(request.auth!.userId);
    return { items };
  });

  app.post("/", { preHandler: authenticate }, async (request, reply) => {
    const body = parseOrThrow(createSetupSchema, request.body);
    const setup = await createSetup(request.auth!.userId, {
      ...body,
      description: body.description ?? "",
    });
    reply.status(201).send({ setup });
  });

  app.patch("/:id", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(setupParamsSchema, request.params);
    const body = parseOrThrow(updateSetupSchema, request.body);
    const setup = await updateSetup(request.auth!.userId, params.id, body);
    return { setup };
  });

  app.delete("/:id", { preHandler: authenticate }, async (request, reply) => {
    const params = parseOrThrow(setupParamsSchema, request.params);
    await deleteSetup(request.auth!.userId, params.id);
    reply.status(204).send();
  });
}
