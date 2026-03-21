import { prisma } from "../../lib/prisma.js";
import { consumePasswordVerificationTime, hashPassword, verifyPassword } from "../../lib/password.js";
import { createSession } from "../../lib/session.js";
import { AppError } from "../../utils/errors.js";
import { normalizeUsername } from "../../utils/strings.js";

function toAuthUser(user: { id: string; username: string; createdAt?: Date; updatedAt?: Date }) {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
  };
}

export async function registerUser(params: {
  username: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const username = normalizeUsername(params.username);
  const existing = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    throw new AppError(409, "USERNAME_TAKEN", "Username already exists.");
  }

  const passwordHash = await hashPassword(params.password);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
    },
  });

  const session = await createSession({
    userId: user.id,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
  });

  return {
    user: toAuthUser(user),
    session,
  };
}

export async function loginUser(params: {
  username: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const username = normalizeUsername(params.username);
  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
  });

  const passwordMatches = user
    ? await verifyPassword(params.password, user.passwordHash)
    : await consumePasswordVerificationTime(params.password);

  if (!user || !passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
  }

  const session = await createSession({
    userId: user.id,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
  });

  return {
    user: toAuthUser(user),
    session,
  };
}

export async function changePassword(params: {
  userId: string;
  currentPassword: string;
  nextPassword: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const user = await prisma.user.findUnique({
    where: {
      id: params.userId,
    },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  const passwordMatches = await verifyPassword(params.currentPassword, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect.");
  }

  const passwordHash = await hashPassword(params.nextPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });

    await tx.session.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  });

  const session = await createSession({
    userId: user.id,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
  });

  return {
    user: toAuthUser(user),
    session,
  };
}
