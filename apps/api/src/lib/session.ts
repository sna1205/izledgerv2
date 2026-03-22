import crypto from "node:crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";

function getSessionCookieMaxAgeSeconds() {
  return env.SESSION_TTL_DAYS * 24 * 60 * 60;
}

function getRequestPath(request: FastifyRequest) {
  return request.routeOptions.url || request.raw.url || request.url;
}

function shouldLogSessionLookup(path: string) {
  return path.startsWith("/analytics")
    || path.startsWith("/dashboard")
    || path.startsWith("/auth/me");
}

export function generateSessionToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getSessionCookieLogContext() {
  return {
    name: env.SESSION_COOKIE_NAME,
    path: "/",
    httpOnly: true,
    sameSite: env.SESSION_COOKIE_SAME_SITE,
    secure: env.SESSION_COOKIE_SECURE,
    domain: env.SESSION_COOKIE_DOMAIN ?? null,
    maxAgeSeconds: getSessionCookieMaxAgeSeconds(),
  };
}

export function getSessionCookieOptions() {
  const cookieContext = getSessionCookieLogContext();

  return {
    path: cookieContext.path,
    httpOnly: cookieContext.httpOnly,
    sameSite: cookieContext.sameSite,
    secure: cookieContext.secure,
    domain: env.SESSION_COOKIE_DOMAIN,
    maxAge: cookieContext.maxAgeSeconds,
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
  const path = getRequestPath(request);
  const shouldLog = shouldLogSessionLookup(path);

  if (!rawToken) {
    if (shouldLog) {
      request.log.warn({
        path,
        origin: request.headers.origin,
        referer: request.headers.referer,
        hasSessionCookie: false,
      }, "Authenticated request did not include a session cookie.");
    }

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
    if (shouldLog) {
      request.log.warn({
        path,
        origin: request.headers.origin,
        referer: request.headers.referer,
        hasSessionCookie: true,
        sessionTokenHashPrefix: tokenHash.slice(0, 12),
      }, "Session cookie was received, but no active session matched it.");
    }

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

  if (shouldLog) {
    request.log.info({
      path,
      userId: session.userId,
      sessionId: session.id,
      hasSessionCookie: true,
      sessionTokenHashPrefix: tokenHash.slice(0, 12),
    }, "Authenticated request session was loaded successfully.");
  }

  return {
    rawToken,
    tokenHash,
    session,
  };
}
