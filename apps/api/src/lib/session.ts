import crypto from "node:crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";

export function generateSessionToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getSessionCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.SESSION_COOKIE_SECURE,
    domain: env.SESSION_COOKIE_DOMAIN,
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

export async function createSession(params: {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      tokenHash,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return {
    rawToken,
    session,
  };
}

export function setSessionCookie(reply: FastifyReply, rawToken: string) {
  reply.setCookie(env.SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions());
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(env.SESSION_COOKIE_NAME, {
    ...getSessionCookieOptions(),
    maxAge: undefined,
  });
}

export async function invalidateSessionByToken(rawToken: string) {
  await prisma.session.updateMany({
    where: {
      tokenHash: hashSessionToken(rawToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function getSessionFromRequest(request: FastifyRequest) {
  const rawToken = request.cookies[env.SESSION_COOKIE_NAME];

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);
  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  await prisma.session.update({
    where: {
      id: session.id,
    },
    data: {
      lastAccessedAt: new Date(),
    },
  });

  return {
    rawToken,
    tokenHash,
    session,
  };
}
