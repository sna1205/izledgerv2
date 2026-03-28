import { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import {
  clearSessionCookie,
  getSessionCookieLogContext,
  invalidateSessionByToken,
  setSessionCookie,
} from "../../lib/session.js";
import { parseOrThrow } from "../../utils/http.js";
import { changePasswordSchema, credentialsSchema } from "./schemas.js";
import { changePassword, loginUser, registerUser } from "./service.js";
import { checklistPreferenceSchema } from "../checklist-rules/schemas.js";
import { updateChecklistEnforcementMode } from "../checklist-rules/service.js";

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
      request.log.info({
        userId: result.user.id,
        sessionId: result.session.session.id,
        cookie: getSessionCookieLogContext(),
      }, "Issued session cookie after user registration.");
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
      request.log.info({
        userId: result.user.id,
        sessionId: result.session.session.id,
        cookie: getSessionCookieLogContext(),
      }, "Issued session cookie after user login.");
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
    request.log.info({
      hadSessionCookie: Boolean(rawToken),
      cookieName: env.SESSION_COOKIE_NAME,
    }, "Cleared session cookie during logout.");
    reply.status(204).send();
  });

  app.get("/me", { preHandler: authenticate }, async (request) => {
    const user = await prisma.user.findUnique({
      where: {
        id: request.auth!.userId,
      },
      select: {
        id: true,
        username: true,
        checklistEnforcementMode: true,
      },
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found.");
    }

    return {
      user,
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
      request.log.info({
        userId: result.user.id,
        sessionId: result.session.session.id,
        cookie: getSessionCookieLogContext(),
      }, "Rotated session cookie after password change.");
      reply.send({
        user: result.user,
      });
    },
  );

  app.patch("/preferences", { preHandler: authenticate }, async (request) => {
    const body = parseOrThrow(checklistPreferenceSchema, request.body);
    const user = await updateChecklistEnforcementMode(request.auth!.userId, body.checklistEnforcementMode);
    return {
      user: {
        id: user.id,
        username: user.username,
        checklistEnforcementMode: user.checklistEnforcementMode,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  });
}
