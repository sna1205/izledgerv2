import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { parseOrThrow } from "../../utils/http.js";
import { accountParamsSchema, createAccountSchema, updateAccountSchema } from "./schemas.js";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "./service.js";

export async function accountRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: authenticate }, async (request) => {
    const items = await listAccounts(request.auth!.userId);
    return { items };
  });

  app.post("/", { preHandler: authenticate }, async (request, reply) => {
    const body = parseOrThrow(createAccountSchema, request.body);
    const account = await createAccount(request.auth!.userId, body);
    reply.status(201).send({ account });
  });

  app.patch("/:id", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(accountParamsSchema, request.params);
    const body = parseOrThrow(updateAccountSchema, request.body);
    const account = await updateAccount(request.auth!.userId, params.id, body);
    return { account };
  });

  app.delete("/:id", { preHandler: authenticate }, async (request, reply) => {
    const params = parseOrThrow(accountParamsSchema, request.params);
    await deleteAccount(request.auth!.userId, params.id);
    reply.status(204).send();
  });
}
