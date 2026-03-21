import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";

const [{ buildApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/prisma.js"),
]);

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(rawCookie, "Expected auth response to set a session cookie.");
  return rawCookie.split(";", 1)[0];
}

test("daily and weekly reviews persist, list cleanly, and stay unique after duplicate attempts", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `rp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);

    const createDailyResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "daily",
        reviewDate: "2026-03-21",
        lessonLearned: "Daily persistence coverage",
        marketObservations: "Trend stayed clean.",
      },
    });

    assert.equal(createDailyResponse.statusCode, 201);
    const dailyReviewId = createDailyResponse.json().review.id as string;

    const persistedDailyReview = await prisma.review.findUnique({
      where: { id: dailyReviewId },
      select: {
        type: true,
        reviewDate: true,
        lessonLearned: true,
        dailyScopeDate: true,
      },
    });

    assert.ok(persistedDailyReview, "Expected the daily review to be saved.");
    assert.equal(persistedDailyReview.type, "daily");
    assert.equal(persistedDailyReview.reviewDate?.toISOString().slice(0, 10), "2026-03-21");
    assert.equal(persistedDailyReview.dailyScopeDate?.toISOString().slice(0, 10), "2026-03-21");
    assert.equal(persistedDailyReview.lessonLearned, "Daily persistence coverage");

    const duplicateDailyResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "daily",
        reviewDate: "2026-03-21",
        lessonLearned: "Duplicate daily review",
      },
    });

    assert.equal(duplicateDailyResponse.statusCode, 409);
    assert.equal(duplicateDailyResponse.json().error.code, "DAILY_REVIEW_EXISTS");

    const listDailyResponse = await app.inject({
      method: "GET",
      url: "/reviews?type=daily&page=1&pageSize=10&sortBy=reviewDate&sortOrder=desc&dateFrom=2026-03-01&dateTo=2026-03-31",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(listDailyResponse.statusCode, 200);
    assert.equal(listDailyResponse.json().pagination.total, 1);
    assert.equal(listDailyResponse.json().items[0].id, dailyReviewId);
    assert.equal(listDailyResponse.json().items[0].lessonLearned, "Daily persistence coverage");

    const createWeeklyResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "weekly",
        weekStart: "2026-03-16",
        weekEnd: "2026-03-22",
        weeklySummary: "Weekly persistence coverage",
        weeklyRating: 8,
      },
    });

    assert.equal(createWeeklyResponse.statusCode, 201);
    const weeklyReviewId = createWeeklyResponse.json().review.id as string;

    const duplicateWeeklyResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "weekly",
        weekStart: "2026-03-16",
        weekEnd: "2026-03-22",
        weeklySummary: "Duplicate weekly review",
      },
    });

    assert.equal(duplicateWeeklyResponse.statusCode, 409);
    assert.equal(duplicateWeeklyResponse.json().error.code, "WEEKLY_REVIEW_EXISTS");

    const persistedWeeklyReview = await prisma.review.findUnique({
      where: { id: weeklyReviewId },
      select: {
        type: true,
        weekStart: true,
        weekEnd: true,
        weeklyScopeStart: true,
        weeklySummary: true,
      },
    });

    assert.ok(persistedWeeklyReview, "Expected the weekly review to be saved.");
    assert.equal(persistedWeeklyReview.type, "weekly");
    assert.equal(persistedWeeklyReview.weekStart?.toISOString().slice(0, 10), "2026-03-16");
    assert.equal(persistedWeeklyReview.weekEnd?.toISOString().slice(0, 10), "2026-03-22");
    assert.equal(persistedWeeklyReview.weeklyScopeStart?.toISOString().slice(0, 10), "2026-03-16");
    assert.equal(persistedWeeklyReview.weeklySummary, "Weekly persistence coverage");

    const listWeeklyResponse = await app.inject({
      method: "GET",
      url: "/reviews?type=weekly&page=1&pageSize=10&sortBy=weekEnd&sortOrder=desc&dateFrom=2026-03-01&dateTo=2026-03-31",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(listWeeklyResponse.statusCode, 200);
    assert.equal(listWeeklyResponse.json().pagination.total, 1);
    assert.equal(listWeeklyResponse.json().items[0].id, weeklyReviewId);
    assert.equal(listWeeklyResponse.json().items[0].weeklySummary, "Weekly persistence coverage");
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: { username },
    });
    await prisma.$disconnect();
  }
});
