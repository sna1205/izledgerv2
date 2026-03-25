import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { loadUniquenessAudit } from "./lib/uniqueness-backfill.mjs";

const prisma = new PrismaClient();

try {
  const audit = await loadUniquenessAudit(prisma);
  const summary = {
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

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await prisma.$disconnect();
}
