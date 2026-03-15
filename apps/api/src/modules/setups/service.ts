import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";

function toSetupDto(setup: {
  id: string;
  name: string;
  description: string;
  color: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: setup.id,
    name: setup.name,
    description: setup.description,
    color: setup.color,
    isArchived: setup.isArchived,
    createdAt: setup.createdAt.toISOString(),
    updatedAt: setup.updatedAt.toISOString(),
  };
}

async function ensureUniqueSetupName(userId: string, name: string, excludeId?: string) {
  const existing = await prisma.setup.findFirst({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    throw new AppError(409, "SETUP_NAME_TAKEN", "Setup names must be unique.");
  }
}

async function getOwnedSetup(userId: string, setupId: string) {
  const setup = await prisma.setup.findFirst({
    where: {
      id: setupId,
      userId,
    },
  });

  if (!setup) {
    throw new AppError(404, "SETUP_NOT_FOUND", "Setup not found.");
  }

  return setup;
}

export async function listSetups(userId: string) {
  const setups = await prisma.setup.findMany({
    where: { userId },
    orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }],
  });

  return setups.map(toSetupDto);
}

export async function createSetup(userId: string, input: {
  name: string;
  description: string;
  color: string;
  isArchived?: boolean;
}) {
  await ensureUniqueSetupName(userId, input.name);

  const setup = await prisma.setup.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      color: input.color,
      isArchived: input.isArchived ?? false,
    },
  });

  return toSetupDto(setup);
}

export async function updateSetup(userId: string, setupId: string, input: {
  name?: string;
  description?: string;
  color?: string;
  isArchived?: boolean;
}) {
  const existing = await getOwnedSetup(userId, setupId);

  if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
    await ensureUniqueSetupName(userId, input.name, setupId);
  }

  const setup = await prisma.setup.update({
    where: { id: setupId },
    data: {
      name: input.name,
      description: input.description,
      color: input.color,
      isArchived: input.isArchived,
    },
  });

  return toSetupDto(setup);
}

export async function deleteSetup(userId: string, setupId: string) {
  await getOwnedSetup(userId, setupId);

  await prisma.$transaction(async (tx) => {
    await tx.trade.updateMany({
      where: {
        userId,
        setupId,
      },
      data: {
        setupId: null,
      },
    });

    await tx.setup.delete({
      where: {
        id: setupId,
      },
    });
  });
}
