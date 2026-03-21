import { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../utils/errors.js";
import { authenticate } from "./auth.js";

export const FOUNDER_USERNAME = "VEASNA";

export function isFounderUsername(username: string) {
  return username === FOUNDER_USERNAME;
}

export async function requireFounder(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);

  if (!request.auth || !isFounderUsername(request.auth.username)) {
    throw new AppError(403, "FORBIDDEN", "Founder access required.");
  }
}
