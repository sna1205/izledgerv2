import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

const DEFAULT_ACCOUNT_DATA = {
  name: "Main Account",
  broker: "Manual",
  type: "Personal" as const,
  balance: 0,
  currency: "USD",
  isDefault: true,
};

export async function ensureDefaultAccountForUserTx(tx: Prisma.TransactionClient, userId: string) {
  const existingAccount = await tx.account.findFirst({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (existingAccount) {
    return false;
  }

  await tx.account.create({
    data: {
      userId,
      ...DEFAULT_ACCOUNT_DATA,
    },
  });

  return true;
}

export async function createUserWithDefaultAccount(params: {
  username: string;
  passwordHash: string;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: params.username,
        passwordHash: params.passwordHash,
      },
    });

    await ensureDefaultAccountForUserTx(tx, user.id);

    return user;
  });
}
