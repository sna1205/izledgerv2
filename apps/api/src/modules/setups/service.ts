import { Prisma } from "@prisma/client";
import { generateUniqueSetupColor, normalizeSetupColor } from "@izledger/shared/setup-colors";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import { buildPagination } from "../../utils/http.js";

function normalizeSetupName(name: string) {
  return name.trim().toLowerCase();
}

function isUniqueSetupNameConstraint(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;

  return Array.isArray(target)
    && target.some((field) => field === "name_normalized" || field === "nameNormalized");
}

function toSetupDto(setup: {
  id: string;
  name: string;
  description: string;
  color: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    trades: number;
  };
}) {
  return {
    id: setup.id,
    name: setup.name,
    description: setup.description,
    color: normalizeSetupColor(setup.color) ?? "#10B981",
    isArchived: setup.isArchived,
    createdAt: setup.createdAt.toISOString(),
    updatedAt: setup.updatedAt.toISOString(),
    tradeCount: setup._count?.trades ?? 0,
  };
}

async function ensureUniqueSetupName(userId: string, name: string, excludeId?: string) {
  const normalizedName = normalizeSetupName(name);
  const existing = await prisma.setup.findFirst({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      nameNormalized: normalizedName,
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

async function listSetupColors(userId: string, excludeId?: string) {
  const setups = await prisma.setup.findMany({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: {
      color: true,
    },
  });

  return setups.map((setup) => setup.color);
}

async function resolveSetupColor(userId: string, inputColor: string | undefined, options?: {
  excludeId?: string;
  currentColor?: string;
}) {
  const currentColor = normalizeSetupColor(options?.currentColor);

  if (inputColor === undefined) {
    if (currentColor) {
      return currentColor;
    }

    const existingColors = await listSetupColors(userId, options?.excludeId);
    return generateUniqueSetupColor(existingColors, {
      fallbackSeed: `${userId}:${options?.excludeId ?? "create"}:current`,
    });
  }

  const normalizedPreferredColor = normalizeSetupColor(inputColor);

  if (normalizedPreferredColor && currentColor && normalizedPreferredColor === currentColor) {
    return currentColor;
  }

  const existingColors = await listSetupColors(userId, options?.excludeId);
  const usedColors = new Set(
    existingColors
      .map((color) => normalizeSetupColor(color))
      .filter((color): color is string => Boolean(color)),
  );

  if (normalizedPreferredColor && !usedColors.has(normalizedPreferredColor)) {
    return normalizedPreferredColor;
  }

  return generateUniqueSetupColor(existingColors, {
    fallbackSeed: `${userId}:${options?.excludeId ?? "create"}:${normalizedPreferredColor ?? "auto"}`,
  });
}

export async function listSetups(userId: string, query: {
  search?: string;
  status: "all" | "active" | "archived";
  page: number;
  pageSize: number;
  sortBy: "createdAt" | "name";
  sortOrder: "asc" | "desc";
}) {
  const where = {
    userId,
    isArchived:
      query.status === "all"
        ? undefined
        : query.status === "archived",
    OR: query.search
      ? [
          {
            name: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
          {
            description: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
        ]
      : undefined,
  } satisfies Prisma.SetupWhereInput;
  const orderBy =
    query.sortBy === "name"
      ? [{ isArchived: "asc" as const }, { name: query.sortOrder }]
      : [{ isArchived: "asc" as const }, { createdAt: query.sortOrder }];

  const [total, setups] = await Promise.all([
    prisma.setup.count({ where }),
    prisma.setup.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        _count: {
          select: {
            trades: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    items: setups.map(toSetupDto),
    pagination: buildPagination(query.page, query.pageSize, total),
  };
}

export async function createSetup(userId: string, input: {
  name: string;
  description: string;
  color?: string;
  isArchived?: boolean;
}) {
  await ensureUniqueSetupName(userId, input.name);
  const color = await resolveSetupColor(userId, input.color);

  try {
    const setup = await prisma.setup.create({
      data: {
        userId,
        name: input.name,
        nameNormalized: normalizeSetupName(input.name),
        description: input.description,
        color,
        isArchived: input.isArchived ?? false,
      },
    });

    return toSetupDto(setup);
  } catch (error) {
    if (isUniqueSetupNameConstraint(error)) {
      throw new AppError(409, "SETUP_NAME_TAKEN", "Setup names must be unique.");
    }

    throw error;
  }
}

export async function updateSetup(userId: string, setupId: string, input: {
  name?: string;
  description?: string;
  color?: string;
  isArchived?: boolean;
}) {
  const existing = await getOwnedSetup(userId, setupId);

  if (input.name && normalizeSetupName(input.name) !== existing.nameNormalized) {
    await ensureUniqueSetupName(userId, input.name, setupId);
  }

  const color = await resolveSetupColor(userId, input.color, {
    excludeId: setupId,
    currentColor: existing.color,
  });

  try {
    const setup = await prisma.setup.update({
      where: { id: setupId },
      data: {
        name: input.name,
        nameNormalized: input.name ? normalizeSetupName(input.name) : undefined,
        description: input.description,
        color,
        isArchived: input.isArchived,
      },
    });

    return toSetupDto(setup);
  } catch (error) {
    if (isUniqueSetupNameConstraint(error)) {
      throw new AppError(409, "SETUP_NAME_TAKEN", "Setup names must be unique.");
    }

    throw error;
  }
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
