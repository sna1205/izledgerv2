import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { toNumber } from "../../lib/decimal.js";
import { AppError } from "../../utils/errors.js";

function toAccountDto(account: {
  id: string;
  name: string;
  broker: string;
  type: string;
  balance: unknown;
  currency: string;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: account.id,
    name: account.name,
    broker: account.broker,
    type: account.type,
    balance: toNumber(account.balance as string | number | null | undefined),
    currency: account.currency,
    isDefault: account.isDefault,
    isArchived: account.isArchived,
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

function isDefaultAccountConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isTradeReferenceConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

async function findReplacementDefaultAccount(tx: Prisma.TransactionClient, userId: string, excludeAccountId?: string) {
  return tx.account.findFirst({
    where: {
      userId,
      isArchived: false,
      id: excludeAccountId ? { not: excludeAccountId } : undefined,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function hasAnotherActiveDefault(tx: Prisma.TransactionClient, userId: string, excludeAccountId: string) {
  const defaultCount = await tx.account.count({
    where: {
      userId,
      isArchived: false,
      isDefault: true,
      id: {
        not: excludeAccountId,
      },
    },
  });

  return defaultCount > 0;
}

export async function listAccounts(userId: string, query: {
  status: "all" | "active" | "archived";
}) {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      isArchived:
        query.status === "all"
          ? undefined
          : query.status === "archived",
    },
    orderBy: [
      { isArchived: "asc" },
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
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const account = await prisma.$transaction(async (tx) => {
        const activeAccountCount = await tx.account.count({
          where: {
            userId,
            isArchived: false,
          },
        });
        const shouldBeDefault = input.isDefault ?? activeAccountCount === 0;

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
    } catch (error) {
      if (!isDefaultAccountConstraintError(error) || attempt === 1) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError;
}

export async function updateAccount(userId: string, accountId: string, input: {
  name?: string;
  broker?: string;
  type?: "Personal" | "Funded" | "Challenge" | "Demo" | "Crypto";
  balance?: number;
  currency?: string;
  isDefault?: boolean;
  isArchived?: boolean;
}) {
  const existingAccount = await getOwnedAccount(userId, accountId);
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const account = await prisma.$transaction(async (tx) => {
        const nextIsArchived = input.isArchived ?? existingAccount.isArchived;
        const userRequestedDefault = input.isDefault === true;
        const activeReplacement = await findReplacementDefaultAccount(tx, userId, accountId);
        const anotherActiveDefaultExists = await hasAnotherActiveDefault(tx, userId, accountId);

        if (nextIsArchived && userRequestedDefault) {
          throw new AppError(409, "ARCHIVED_ACCOUNT_CANNOT_BE_DEFAULT", "Archived accounts cannot be the default account.");
        }

        if (input.isDefault === false && existingAccount.isDefault && !nextIsArchived && !activeReplacement) {
          throw new AppError(409, "DEFAULT_ACCOUNT_REQUIRED", "You must have at least one default account");
        }

        let nextIsDefault = input.isDefault ?? existingAccount.isDefault;

        if (nextIsArchived) {
          nextIsDefault = false;
        } else if (userRequestedDefault) {
          nextIsDefault = true;
        } else if (existingAccount.isArchived && input.isArchived === false && !anotherActiveDefaultExists) {
          nextIsDefault = true;
        }

        if (nextIsDefault) {
          await tx.account.updateMany({
            where: { userId },
            data: { isDefault: false },
          });
        }

        const updatedAccount = await tx.account.update({
          where: { id: accountId },
          data: {
            name: input.name,
            broker: input.broker,
            type: input.type,
            balance: input.balance,
            currency: input.currency?.toUpperCase(),
            isDefault: nextIsDefault,
            isArchived: input.isArchived,
          },
        });

        if (existingAccount.isDefault && !updatedAccount.isDefault) {
          const replacement = await findReplacementDefaultAccount(tx, userId, updatedAccount.id);

          if (replacement) {
            await tx.account.update({
              where: { id: replacement.id },
              data: { isDefault: true },
            });
          }
        }

        return updatedAccount;
      });

      return toAccountDto(account);
    } catch (error) {
      if (!isDefaultAccountConstraintError(error) || attempt === 1) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError;
}

export async function deleteAccount(userId: string, accountId: string) {
  const account = await getOwnedAccount(userId, accountId);
  const tradeCount = await prisma.trade.count({
    where: {
      accountId,
    },
  });

  if (tradeCount > 0) {
    throw new AppError(409, "ACCOUNT_IN_USE", "Account cannot be deleted because trades still reference it. Archive the account instead.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.account.delete({
        where: { id: accountId },
      });

      if (account.isDefault) {
        const replacement = await findReplacementDefaultAccount(tx, userId, accountId);

        if (replacement) {
          await tx.account.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }
    });
  } catch (error) {
    if (isTradeReferenceConstraintError(error)) {
      throw new AppError(409, "ACCOUNT_IN_USE", "Account cannot be deleted because trades still reference it. Archive the account instead.");
    }

    throw error;
  }
}
