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

test("review creation rejects impossible calendar dates at the API boundary", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `rd${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username,
        password,
      },
    });

    assert.equal(registerResponse.statusCode, 201);

    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const reviewResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "daily",
        reviewDate: "2026-02-30",
        lessonLearned: "Impossible date regression",
      },
    });

    assert.equal(reviewResponse.statusCode, 400);
    const payload = reviewResponse.json();
    assert.equal(payload.error.code, "VALIDATION_ERROR");
    assert.equal(payload.error.message, "Invalid request");
    assert.deepEqual(payload.error.details, [
      {
        field: "reviewDate",
        message: "Invalid review date",
      },
    ]);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username,
      },
    });
    await prisma.$disconnect();
  }
});

test("weekly review creation rejects invalid week scope at the API boundary", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `rw${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username,
        password,
      },
    });

    assert.equal(registerResponse.statusCode, 201);

    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const reviewResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "weekly",
        weekStart: "2026-03-17",
        weekEnd: "2026-03-22",
        weeklySummary: "Invalid weekly scope regression",
      },
    });

    assert.equal(reviewResponse.statusCode, 400);
    const payload = reviewResponse.json();
    assert.equal(payload.error.code, "VALIDATION_ERROR");
    assert.equal(payload.error.message, "Invalid request");
    assert.deepEqual(payload.error.details, [
      {
        field: "weekStart",
        message: "Week start must be a Monday.",
      },
      {
        field: "weekEnd",
        message: "Week end must be the Sunday for the same review week.",
      },
    ]);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username,
      },
    });
    await prisma.$disconnect();
  }
});

test("weekly review creation accepts a valid Monday-through-Sunday UTC scope", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `rv${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username,
        password,
      },
    });

    assert.equal(registerResponse.statusCode, 201);

    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);
    const reviewResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "weekly",
        weekStart: "2026-03-16",
        weekEnd: "2026-03-22",
        weeklySummary: "Valid review week",
      },
    });

    assert.equal(reviewResponse.statusCode, 201);
    const payload = reviewResponse.json();
    assert.equal(payload.review.weekStart, "2026-03-16");
    assert.equal(payload.review.weekEnd, "2026-03-22");
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username,
      },
    });
    await prisma.$disconnect();
  }
});
