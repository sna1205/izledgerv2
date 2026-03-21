import fs from "node:fs/promises";
import path from "node:path";

function isoDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : null;
}

export function normalizeSetupName(name) {
  return name.trim().toLowerCase();
}

function compareSetups(left, right) {
  const createdAtDelta = left.createdAt.getTime() - right.createdAt.getTime();

  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  return left.id.localeCompare(right.id);
}

function compareReviewsForCanonical(left, right) {
  const updatedAtDelta = right.updatedAt.getTime() - left.updatedAt.getTime();

  if (updatedAtDelta !== 0) {
    return updatedAtDelta;
  }

  const createdAtDelta = right.createdAt.getTime() - left.createdAt.getTime();

  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  return right.id.localeCompare(left.id);
}

function truncateSetupName(baseName, suffix) {
  const maxBaseLength = Math.max(1, 100 - suffix.length);
  return `${baseName.slice(0, maxBaseLength).trimEnd()}${suffix}`;
}

function toAuditSummary(audit) {
  return {
    setupDuplicates: audit.setupDuplicates.map((group) => ({
      userId: group.userId,
      normalizedName: group.normalizedName,
      duplicateCount: group.setups.length,
      setupIds: group.setups.map((setup) => setup.id),
    })),
    dailyReviewDuplicates: audit.dailyReviewDuplicates.map((group) => ({
      userId: group.userId,
      reviewDate: group.reviewDate,
      duplicateCount: group.reviews.length,
      reviewIds: group.reviews.map((review) => review.id),
    })),
    weeklyReviewDuplicates: audit.weeklyReviewDuplicates.map((group) => ({
      userId: group.userId,
      weekStart: group.weekStart,
      duplicateCount: group.reviews.length,
      reviewIds: group.reviews.map((review) => review.id),
    })),
  };
}

export async function loadUniquenessAudit(prisma) {
  const [setups, reviews] = await Promise.all([
    prisma.setup.findMany({
      select: {
        id: true,
        userId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { userId: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.review.findMany({
      select: {
        id: true,
        userId: true,
        type: true,
        reviewDate: true,
        weekStart: true,
        weekEnd: true,
        createdAt: true,
        updatedAt: true,
      },
      where: {
        type: {
          in: ["daily", "weekly"],
        },
      },
      orderBy: [
        { userId: "asc" },
        { updatedAt: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
    }),
  ]);

  const setupGroups = new Map();
  const setupNamesByUser = new Map();

  for (const setup of setups) {
    const normalizedName = normalizeSetupName(setup.name);
    const key = `${setup.userId}:${normalizedName}`;
    const userNames = setupNamesByUser.get(setup.userId) ?? new Set();
    userNames.add(normalizedName);
    setupNamesByUser.set(setup.userId, userNames);
    const existing = setupGroups.get(key);

    if (existing) {
      existing.setups.push(setup);
      continue;
    }

    setupGroups.set(key, {
      userId: setup.userId,
      normalizedName,
      setups: [setup],
    });
  }

  const dailyGroups = new Map();
  const weeklyGroups = new Map();

  for (const review of reviews) {
    if (review.type === "daily" && review.reviewDate) {
      const reviewDate = isoDate(review.reviewDate);
      const key = `${review.userId}:${reviewDate}`;
      const existing = dailyGroups.get(key);

      if (existing) {
        existing.reviews.push(review);
        continue;
      }

      dailyGroups.set(key, {
        userId: review.userId,
        reviewDate,
        reviews: [review],
      });
      continue;
    }

    if (review.type === "weekly" && review.weekStart) {
      const weekStart = isoDate(review.weekStart);
      const existing = weeklyGroups.get(`${review.userId}:${weekStart}`);

      if (existing) {
        existing.reviews.push(review);
        continue;
      }

      weeklyGroups.set(`${review.userId}:${weekStart}`, {
        userId: review.userId,
        weekStart,
        reviews: [review],
      });
    }
  }

  return {
    setupNamesByUser,
    setupDuplicates: [...setupGroups.values()]
      .filter((group) => group.setups.length > 1)
      .map((group) => ({
        ...group,
        setups: [...group.setups].sort(compareSetups),
      })),
    dailyReviewDuplicates: [...dailyGroups.values()]
      .filter((group) => group.reviews.length > 1)
      .map((group) => ({
        ...group,
        reviews: [...group.reviews].sort(compareReviewsForCanonical),
      })),
    weeklyReviewDuplicates: [...weeklyGroups.values()]
      .filter((group) => group.reviews.length > 1)
      .map((group) => ({
        ...group,
        reviews: [...group.reviews].sort(compareReviewsForCanonical),
      })),
  };
}

export async function writeUniquenessReport(audit, plan, options = {}) {
  const reportDir = options.reportDir ?? path.join(process.cwd(), "apps/api/prisma/backfill-reports");
  await fs.mkdir(reportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDir, `${timestamp}-scope-uniqueness-backfill.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    duplicateAudit: toAuditSummary(audit),
    remediationPlan: plan,
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

export function buildUniquenessRemediationPlan(audit) {
  const setupRenames = [];
  const reviewDeletes = [];
  const allSetupsByUser = new Map(
    [...audit.setupNamesByUser.entries()].map(([userId, names]) => [userId, new Set(names)]),
  );

  for (const group of audit.setupDuplicates) {
    const usedNames = allSetupsByUser.get(group.userId) ?? new Set();
    const [, ...duplicates] = group.setups;

    for (const setup of duplicates) {
      const baseName = setup.name.trim();
      let suffixNumber = 2;
      let nextName = baseName;

      do {
        const suffix = ` (${suffixNumber})`;
        nextName = truncateSetupName(baseName, suffix);
        suffixNumber += 1;
      } while (usedNames.has(normalizeSetupName(nextName)));

      usedNames.add(normalizeSetupName(nextName));
      setupRenames.push({
        setupId: setup.id,
        userId: setup.userId,
        previousName: setup.name,
        nextName,
      });
    }
  }

  for (const group of [...audit.dailyReviewDuplicates, ...audit.weeklyReviewDuplicates]) {
    const [canonical, ...duplicates] = group.reviews;

    for (const review of duplicates) {
      reviewDeletes.push({
        reviewId: review.id,
        userId: review.userId,
        type: review.type,
        canonicalReviewId: canonical.id,
        reviewDate: isoDate(review.reviewDate),
        weekStart: isoDate(review.weekStart),
        weekEnd: isoDate(review.weekEnd),
      });
    }
  }

  return {
    setupRenames,
    reviewDeletes,
  };
}

export async function applyUniquenessRemediationPlan(prisma, plan) {
  await prisma.$transaction(async (tx) => {
    for (const rename of plan.setupRenames) {
      await tx.setup.update({
        where: {
          id: rename.setupId,
        },
        data: {
          name: rename.nextName,
        },
      });
    }

    if (plan.reviewDeletes.length > 0) {
      await tx.review.deleteMany({
        where: {
          id: {
            in: plan.reviewDeletes.map((item) => item.reviewId),
          },
        },
      });
    }
  });
}
