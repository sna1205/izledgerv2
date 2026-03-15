import { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/auth.js";
import { clearSessionCookie, invalidateSessionByToken, setSessionCookie } from "../../lib/session.js";
import { parseOrThrow } from "../../utils/http.js";
import { changePasswordSchema, credentialsSchema } from "./schemas.js";
import { changePassword, loginUser, registerUser } from "./service.js";

export async function authRoutes(app: FastifyInstance) {
  const authRateLimit = {
    max: env.AUTH_RATE_LIMIT_MAX,
    timeWindow: `${env.AUTH_RATE_LIMIT_WINDOW_MINUTES} minute`,
  };

  app.post(
    "/register",
    { config: { rateLimit: authRateLimit } },
    async (request, reply) => {
      const body = parseOrThrow(credentialsSchema, request.body);
      const result = await registerUser({
        username: body.username,
        password: body.password,
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      });

      setSessionCookie(reply, result.session.rawToken);
      reply.status(201).send({
        user: result.user,
      });
    },
  );

  app.post(
    "/login",
    { config: { rateLimit: authRateLimit } },
    async (request, reply) => {
      const body = parseOrThrow(credentialsSchema, request.body);
      const result = await loginUser({
        username: body.username,
        password: body.password,
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      });

      setSessionCookie(reply, result.session.rawToken);
      reply.send({
        user: result.user,
      });
    },
  );

  app.post("/logout", async (request, reply) => {
    const rawToken = request.cookies[env.SESSION_COOKIE_NAME];

    if (rawToken) {
      await invalidateSessionByToken(rawToken);
    }

    clearSessionCookie(reply);
    reply.status(204).send();
  });

  app.get("/me", { preHandler: authenticate }, async (request) => {
    return {
      user: {
        id: request.auth!.userId,
        username: request.auth!.username,
      },
    };
  });

  app.post(
    "/change-password",
    { preHandler: authenticate, config: { rateLimit: authRateLimit } },
    async (request, reply) => {
      const body = parseOrThrow(changePasswordSchema, request.body);
      const result = await changePassword({
        userId: request.auth!.userId,
        currentPassword: body.currentPassword,
        nextPassword: body.nextPassword,
        userAgent: request.headers["user-agent"],
        ipAddress: request.ip,
      });

      setSessionCookie(reply, result.session.rawToken);
      reply.send({
        user: result.user,
      });
    },
  );
}
