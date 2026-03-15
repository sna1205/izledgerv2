import { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../utils/errors.js";
import { clearSessionCookie, getSessionFromRequest } from "../lib/session.js";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const sessionData = await getSessionFromRequest(request);

  if (!sessionData) {
    clearSessionCookie(reply);
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }

  request.auth = {
    userId: sessionData.session.user.id,
    username: sessionData.session.user.username,
    sessionId: sessionData.session.id,
    sessionTokenHash: sessionData.tokenHash,
  };
}
