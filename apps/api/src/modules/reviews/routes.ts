import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { parseOrThrow } from "../../utils/http.js";
import { createReviewSchema, listReviewsQuerySchema, reviewParamsSchema, updateReviewSchema } from "./schemas.js";
import { createReview, deleteReview, getReview, listReviews, updateReview } from "./service.js";

export async function reviewRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: authenticate }, async (request) => {
    const query = parseOrThrow(listReviewsQuerySchema, request.query);
    return listReviews(request.auth!.userId, {
      ...query,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  });

  app.post("/", { preHandler: authenticate }, async (request, reply) => {
    const body = parseOrThrow(createReviewSchema, request.body);
    const review = await createReview(request.auth!.userId, body);
    reply.status(201).send({ review });
  });

  app.get("/:id", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(reviewParamsSchema, request.params);
    const review = await getReview(request.auth!.userId, params.id);
    return { review };
  });

  app.patch("/:id", { preHandler: authenticate }, async (request) => {
    const params = parseOrThrow(reviewParamsSchema, request.params);
    const body = parseOrThrow(updateReviewSchema, request.body);
    const review = await updateReview(request.auth!.userId, params.id, body);
    return { review };
  });

  app.delete("/:id", { preHandler: authenticate }, async (request, reply) => {
    const params = parseOrThrow(reviewParamsSchema, request.params);
    await deleteReview(request.auth!.userId, params.id);
    reply.status(204).send();
  });
}
