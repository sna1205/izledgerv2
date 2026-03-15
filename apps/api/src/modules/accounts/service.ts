import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import { toNumber } from "../../utils/decimal.js";

function toAccountDto(account: {
  id: string;
  name: string;
  broker: string;
  type: string;
  balance: unknown;
  currency: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: account.id,
    name: account.name,
    broker: account.broker,
    type: account.type,
    balance: toNumber(account.balance as never),
    currency: account.currency,
    isDefault: account.isDefault,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

async function getOwnedAccount(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
  });

  if (!account) {
    throw new AppError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
  }

  return account;
}

export async function listAccounts(userId: string) {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
    },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "asc" },
    ],
  });

  return accounts.map(toAccountDto);
}

export async function createAccount(userId: string, input: {
  name: string;
  broker: string;
  type: "Personal" | "Funded" | "Challenge" | "Demo" | "Crypto";
  balance: number;
  currency: string;
  isDefault?: boolean;
}) {
  const existingCount = await prisma.account.count({
    where: { userId },
  });

  const shouldBeDefault = input.isDefault ?? existingCount === 0;

  const account = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.account.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return tx.account.create({
      data: {
        userId,
        name: input.name,
        broker: input.broker,
        type: input.type,
        balance: input.balance,
        currency: input.currency.toUpperCase(),
        isDefault: shouldBeDefault,
      },
    });
  });

  return toAccountDto(account);
}

export async function updateAccount(userId: string, accountId: string, input: {
  name?: string;
  broker?: string;
  type?: "Personal" | "Funded" | "Challenge" | "Demo" | "Crypto";
  balance?: number;
  currency?: string;
  isDefault?: boolean;
}) {
  await getOwnedAccount(userId, accountId);

  const account = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.account.updateMany({
        where: {
          userId,
          NOT: { id: accountId },
        },
        data: { isDefault: false },
      });
    }

    return tx.account.update({
      where: { id: accountId },
      data: {
        name: input.name,
        broker: input.broker,
        type: input.type,
        balance: input.balance,
        currency: input.currency?.toUpperCase(),
        isDefault: input.isDefault,
      },
    });
  });

  return toAccountDto(account);
}

export async function deleteAccount(userId: string, accountId: string) {
  const account = await getOwnedAccount(userId, accountId);
  const accountCount = await prisma.account.count({ where: { userId } });

  if (accountCount <= 1) {
    throw new AppError(409, "LAST_ACCOUNT", "At least one account must remain.");
  }

  const activeTradeCount = await prisma.trade.count({
    where: {
      userId,
      accountId,
      deletedAt: null,
    },
  });

  if (activeTradeCount > 0) {
    throw new AppError(409, "ACCOUNT_IN_USE", "This account has trades and cannot be deleted.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.account.delete({
      where: { id: accountId },
    });

    if (account.isDefault) {
      const replacement = await tx.account.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });

      if (replacement) {
        await tx.account.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }
  });
}
