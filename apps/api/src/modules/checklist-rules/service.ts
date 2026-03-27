import { ChecklistEnforcementMode, ChecklistRuleScopeType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";

const checklistRuleInclude = Prisma.validator<Prisma.ChecklistRuleInclude>()({
  setup: {
    select: {
      id: true,
      name: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
    },
  },
});

type ChecklistRuleRecord = Prisma.ChecklistRuleGetPayload<{ include: typeof checklistRuleInclude }>;
type ChecklistTransactionClient = Prisma.TransactionClient;

export type ChecklistResponseInput = {
  checklistRuleId: string;
  checked: boolean;
  note?: string | null;
};

function toChecklistRuleDto(rule: ChecklistRuleRecord) {
  return {
    id: rule.id,
    title: rule.title,
    description: rule.description,
    isRequired: rule.isRequired,
    isActive: rule.isActive,
    sortOrder: rule.sortOrder,
    scopeType: rule.scopeType,
    setupId: rule.setupId,
    accountId: rule.accountId,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    setup: rule.setup
      ? {
          id: rule.setup.id,
          name: rule.setup.name,
        }
      : null,
    account: rule.account
      ? {
          id: rule.account.id,
          name: rule.account.name,
        }
      : null,
  };
}

function normalizeChecklistNote(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeChecklistRuleTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function deriveChecklistRuleScopeType(input: {
  setupId?: string | null;
  accountId?: string | null;
}) {
  if (input.setupId && input.accountId) {
    return ChecklistRuleScopeType.account_setup;
  }

  if (input.setupId) {
    return ChecklistRuleScopeType.setup;
  }

  if (input.accountId) {
    return ChecklistRuleScopeType.account;
  }

  return ChecklistRuleScopeType.global;
}

async function ensureOwnedAccount(tx: Prisma.TransactionClient | typeof prisma, userId: string, accountId: string) {
  const account = await tx.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!account) {
    throw new AppError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
  }
}

async function ensureOwnedSetup(tx: Prisma.TransactionClient | typeof prisma, userId: string, setupId: string) {
  const setup = await tx.setup.findFirst({
    where: {
      id: setupId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!setup) {
    throw new AppError(404, "SETUP_NOT_FOUND", "Setup not found.");
  }
}

async function validateRuleScope(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string,
  input: {
    setupId?: string | null;
    accountId?: string | null;
  },
) {
  if (input.accountId) {
    await ensureOwnedAccount(tx, userId, input.accountId);
  }

  if (input.setupId) {
    await ensureOwnedSetup(tx, userId, input.setupId);
  }
}

async function getOwnedChecklistRule(userId: string, ruleId: string) {
  const rule = await prisma.checklistRule.findFirst({
    where: {
      id: ruleId,
      userId,
    },
    include: checklistRuleInclude,
  });

  if (!rule) {
    throw new AppError(404, "CHECKLIST_RULE_NOT_FOUND", "Checklist rule not found.");
  }

  return rule;
}

async function findChecklistRuleConflict(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string,
  input: {
    setupId?: string | null;
    accountId?: string | null;
    titleNormalized: string;
    excludeRuleId?: string;
  },
) {
  return tx.checklistRule.findFirst({
    where: {
      userId,
      titleNormalized: input.titleNormalized,
      ...buildExactChecklistScopeWhere({
        setupId: input.setupId,
        accountId: input.accountId,
      }),
      id: input.excludeRuleId
        ? {
            not: input.excludeRuleId,
          }
        : undefined,
    },
    select: {
      id: true,
    },
  });
}

function toChecklistRuleDuplicateError() {
  return new AppError(409, "CHECKLIST_RULE_TITLE_TAKEN", "Checklist rule titles must be unique within the same scope.");
}

function buildChecklistScopeWhere(scope: {
  setupId?: string | null;
  accountId?: string | null;
}) {
  return {
    AND: [
      scope.setupId
        ? {
            OR: [
              { setupId: null },
              { setupId: scope.setupId },
            ],
          }
        : {
            setupId: null,
          },
      scope.accountId
        ? {
            OR: [
              { accountId: null },
              { accountId: scope.accountId },
            ],
          }
        : {
            accountId: null,
          },
    ],
  } satisfies Prisma.ChecklistRuleWhereInput;
}

function buildExactChecklistScopeWhere(scope: {
  setupId?: string | null;
  accountId?: string | null;
}) {
  return {
    setupId: scope.setupId ?? null,
    accountId: scope.accountId ?? null,
  } satisfies Prisma.ChecklistRuleWhereInput;
}

async function getNextSortOrder(userId: string) {
  const result = await prisma.checklistRule.aggregate({
    where: {
      userId,
    },
    _max: {
      sortOrder: true,
    },
  });

  return (result._max.sortOrder ?? -1) + 1;
}

async function findChecklistRules(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string,
  query: {
    activeOnly?: boolean;
    setupId?: string | null;
    accountId?: string | null;
    scopeMode?: "applicable" | "exact";
  },
) {
  const scopeWhere =
    query.scopeMode === "exact"
      ? buildExactChecklistScopeWhere({
          setupId: query.setupId,
          accountId: query.accountId,
        })
      : query.activeOnly
        ? buildChecklistScopeWhere({
            setupId: query.setupId,
            accountId: query.accountId,
          })
        : undefined;

  return tx.checklistRule.findMany({
    where: {
      userId,
      isActive: query.activeOnly ? true : undefined,
      ...(scopeWhere ?? {}),
    },
    include: checklistRuleInclude,
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });
}

export async function listChecklistRules(userId: string, query: {
  activeOnly: boolean;
  setupId?: string | null;
  accountId?: string | null;
  scopeMode?: "applicable" | "exact";
}) {
  await validateRuleScope(prisma, userId, query);
  const rules = await findChecklistRules(prisma, userId, query);

  return {
    items: rules.map(toChecklistRuleDto),
  };
}

export async function createChecklistRule(userId: string, input: {
  title: string;
  description?: string | null;
  isRequired: boolean;
  isActive: boolean;
  setupId?: string | null;
  accountId?: string | null;
}) {
  await validateRuleScope(prisma, userId, input);
  const title = input.title.trim();
  const titleNormalized = normalizeChecklistRuleTitle(title);
  const existingRule = await findChecklistRuleConflict(prisma, userId, {
    setupId: input.setupId,
    accountId: input.accountId,
    titleNormalized,
  });

  if (existingRule) {
    throw toChecklistRuleDuplicateError();
  }

  let rule: ChecklistRuleRecord;

  try {
    rule = await prisma.checklistRule.create({
      data: {
        userId,
        title,
        titleNormalized,
        description: normalizeChecklistNote(input.description),
        isRequired: input.isRequired,
        isActive: input.isActive,
        sortOrder: await getNextSortOrder(userId),
        scopeType: deriveChecklistRuleScopeType(input),
        setupId: input.setupId ?? null,
        accountId: input.accountId ?? null,
      },
      include: checklistRuleInclude,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw toChecklistRuleDuplicateError();
    }

    throw error;
  }

  return toChecklistRuleDto(rule);
}

export async function updateChecklistRule(userId: string, ruleId: string, input: {
  title: string;
  description?: string | null;
  isRequired: boolean;
  isActive: boolean;
  setupId?: string | null;
  accountId?: string | null;
}) {
  await getOwnedChecklistRule(userId, ruleId);
  await validateRuleScope(prisma, userId, input);
  const title = input.title.trim();
  const titleNormalized = normalizeChecklistRuleTitle(title);
  const existingRule = await findChecklistRuleConflict(prisma, userId, {
    setupId: input.setupId,
    accountId: input.accountId,
    titleNormalized,
    excludeRuleId: ruleId,
  });

  if (existingRule) {
    throw toChecklistRuleDuplicateError();
  }

  let rule: ChecklistRuleRecord;

  try {
    rule = await prisma.checklistRule.update({
      where: {
        id: ruleId,
      },
      data: {
        title,
        titleNormalized,
        description: normalizeChecklistNote(input.description),
        isRequired: input.isRequired,
        isActive: input.isActive,
        scopeType: deriveChecklistRuleScopeType(input),
        setupId: input.setupId ?? null,
        accountId: input.accountId ?? null,
      },
      include: checklistRuleInclude,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw toChecklistRuleDuplicateError();
    }

    throw error;
  }

  return toChecklistRuleDto(rule);
}

export async function deleteChecklistRule(userId: string, ruleId: string) {
  await getOwnedChecklistRule(userId, ruleId);

  await prisma.checklistRule.delete({
    where: {
      id: ruleId,
    },
  });
}

export async function toggleChecklistRuleActive(userId: string, ruleId: string, isActive: boolean) {
  await getOwnedChecklistRule(userId, ruleId);

  const rule = await prisma.checklistRule.update({
    where: {
      id: ruleId,
    },
    data: {
      isActive,
    },
    include: checklistRuleInclude,
  });

  return toChecklistRuleDto(rule);
}

export async function reorderChecklistRules(userId: string, ruleIds: string[]) {
  if (new Set(ruleIds).size !== ruleIds.length) {
    throw new AppError(400, "CHECKLIST_REORDER_INVALID", "Checklist rule order is invalid.");
  }

  const rules = await prisma.checklistRule.findMany({
    where: {
      userId,
      id: {
        in: ruleIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (rules.length !== ruleIds.length) {
    throw new AppError(400, "CHECKLIST_REORDER_INVALID", "Checklist rule order is invalid.");
  }

  await prisma.$transaction(
    ruleIds.map((ruleId, index) => prisma.checklistRule.update({
      where: {
        id: ruleId,
      },
      data: {
        sortOrder: index,
      },
    })),
  );

  return listChecklistRules(userId, {
    activeOnly: false,
  });
}

export async function updateChecklistEnforcementMode(userId: string, checklistEnforcementMode: ChecklistEnforcementMode) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      checklistEnforcementMode,
    },
    select: {
      id: true,
      username: true,
      checklistEnforcementMode: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getApplicableChecklistRules(
  tx: ChecklistTransactionClient,
  userId: string,
  scope: {
    setupId?: string | null;
    accountId?: string | null;
  },
  options?: {
    scopeMode?: "applicable" | "exact";
  },
) {
  return findChecklistRules(tx, userId, {
    activeOnly: true,
    setupId: scope.setupId,
    accountId: scope.accountId,
    scopeMode: options?.scopeMode,
  });
}

export async function createTradeChecklistSnapshots(
  tx: ChecklistTransactionClient,
  userId: string,
  tradeId: string,
  params: {
    accountId: string;
    setupId?: string | null;
    checklistResponses?: ChecklistResponseInput[];
    scopeMode?: "applicable" | "exact";
  },
) {
  const [user, applicableRules] = await Promise.all([
    tx.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        checklistEnforcementMode: true,
      },
    }),
    getApplicableChecklistRules(tx, userId, {
      accountId: params.accountId,
      setupId: params.setupId,
    }, {
      scopeMode: "applicable",
    }),
  ]);

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  const submittedResponses = params.checklistResponses ?? [];
  const submittedIds = submittedResponses.map((response) => response.checklistRuleId);

  if (new Set(submittedIds).size !== submittedIds.length) {
    throw new AppError(400, "CHECKLIST_RESPONSE_INVALID", "Checklist submission is invalid.");
  }

  const applicableRuleMap = new Map(applicableRules.map((rule) => [rule.id, rule]));

  for (const response of submittedResponses) {
    if (!applicableRuleMap.has(response.checklistRuleId)) {
      throw new AppError(400, "CHECKLIST_RESPONSE_INVALID", "Checklist submission is invalid.");
    }
  }

  const submittedResponseMap = new Map(
    submittedResponses.map((response) => [response.checklistRuleId, response]),
  );

  const snapshots = applicableRules.map((rule) => {
    const submitted = submittedResponseMap.get(rule.id);

    return {
      tradeId,
      userId,
      checklistRuleId: rule.id,
      ruleTitleSnapshot: rule.title,
      ruleDescriptionSnapshot: rule.description,
      isRequiredSnapshot: rule.isRequired,
      checked: submitted?.checked ?? false,
      note: normalizeChecklistNote(submitted?.note),
      sortOrderSnapshot: rule.sortOrder,
    };
  });

  const incompleteRequiredRules = snapshots.filter((snapshot) => snapshot.isRequiredSnapshot && !snapshot.checked);

  if (user.checklistEnforcementMode === "strict" && incompleteRequiredRules.length > 0) {
    throw new AppError(
      400,
      "CHECKLIST_INCOMPLETE",
      "You must complete all required checklist rules before saving this trade.",
    );
  }

  if (snapshots.length > 0) {
    await tx.tradeChecklistResponse.createMany({
      data: snapshots,
    });
  }

  return {
    checklistEnforcementMode: user.checklistEnforcementMode,
    totalRules: snapshots.length,
    completedRules: snapshots.filter((snapshot) => snapshot.checked).length,
  };
}
