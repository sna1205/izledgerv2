import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { AppError, toAppError, toErrorResponse } from "./utils/errors.js";
import { authRoutes } from "./modules/auth/routes.js";
import { accountRoutes } from "./modules/accounts/routes.js";
import { setupRoutes } from "./modules/setups/routes.js";
import { tradeRoutes } from "./modules/trades/routes.js";
import { screenshotRoutes } from "./modules/screenshots/routes.js";
import { reviewRoutes } from "./modules/reviews/routes.js";
import { analyticsRoutes } from "./modules/analytics/routes.js";
import { tradeShareRoutes } from "./modules/trade-shares/routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === "development"
      ? {
          level: env.LOG_LEVEL,
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          },
        }
      : {
          level: env.LOG_LEVEL,
        },
  });

  app.decorateRequest("auth", null);

  await app.register(cors, {
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  });

  await app.register(helmet, {
    global: true,
  });

  await app.register(cookie);

  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) => new AppError(
      context.statusCode,
      context.ban ? "FORBIDDEN" : "RATE_LIMIT_EXCEEDED",
      context.ban ? "Forbidden." : "Too many requests.",
    ),
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "izledger-backend",
    timestamp: new Date().toISOString(),
  }));

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send(toErrorResponse(new AppError(404, "NOT_FOUND", "Resource not found.")));
  });

  app.setErrorHandler((error, _request, reply) => {
    const appError = toAppError(error);

    if (appError instanceof AppError) {
      reply.status(appError.statusCode).send(toErrorResponse(appError));
      return;
    }

    app.log.error(error);
    reply.status(500).send(toErrorResponse(new AppError(500, "INTERNAL_SERVER_ERROR", "Internal server error.")));
  });

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(accountRoutes, { prefix: "/accounts" });
  await app.register(setupRoutes, { prefix: "/setups" });
  await app.register(tradeRoutes, { prefix: "/trades" });
  await app.register(screenshotRoutes, { prefix: "/trades" });
  await app.register(reviewRoutes, { prefix: "/reviews" });
  await app.register(analyticsRoutes, { prefix: "/" });
  await app.register(tradeShareRoutes, { prefix: "/" });

  return app;
}
