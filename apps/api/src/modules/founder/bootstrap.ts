import { hashPassword, verifyPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import { normalizeUsername } from "../../utils/strings.js";
import { FOUNDER_USERNAME } from "../../middleware/founder.js";
import { createUserWithDefaultAccount, ensureDefaultAccountForUserTx } from "../auth/user-provisioning.js";

type FounderBootstrapLogger = {
  info: (message: string) => void;
};

export async function ensureFounderAccount(params: {
  enabled: boolean;
  password?: string;
  logger?: FounderBootstrapLogger;
}) {
  if (!params.enabled) {
    return { status: "disabled" as const };
  }

  if (!params.password) {
    throw new Error("FOUNDER_BOOTSTRAP_PASSWORD is required when founder bootstrap is enabled.");
  }

  const username = normalizeUsername(FOUNDER_USERNAME);
  const existingFounder = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
  });

  if (!existingFounder) {
    const passwordHash = await hashPassword(params.password);
    const user = await createUserWithDefaultAccount({
      username,
      passwordHash,
    });

    params.logger?.info(`Founder account ensured for ${user.username}.`);

    return {
      status: "created" as const,
      userId: user.id,
    };
  }

  const passwordMatches = await verifyPassword(params.password, existingFounder.passwordHash);
  const nextPasswordHash = passwordMatches ? null : await hashPassword(params.password);
  let didUpdate = false;

  await prisma.$transaction(async (tx) => {
    if (existingFounder.username !== username) {
      await tx.user.update({
        where: {
          id: existingFounder.id,
        },
        data: {
          username,
        },
      });

      didUpdate = true;
    }

    const createdDefaultAccount = await ensureDefaultAccountForUserTx(tx, existingFounder.id);

    if (createdDefaultAccount) {
      didUpdate = true;
    }

    if (nextPasswordHash) {
      await tx.user.update({
        where: {
          id: existingFounder.id,
        },
        data: {
          passwordHash: nextPasswordHash,
        },
      });

      await tx.session.updateMany({
        where: {
          userId: existingFounder.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      didUpdate = true;
    }
  });

  params.logger?.info(
    didUpdate
      ? `Founder account synced for ${username}.`
      : `Founder account already ready for ${username}.`,
  );

  return {
    status: didUpdate ? "synced" as const : "verified" as const,
    userId: existingFounder.id,
  };
}
