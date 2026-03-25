import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.APP_URL ??= "http://127.0.0.1:3000";
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

test("setup creation rejects case-insensitive duplicate names for the same user", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `su${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);

    const firstResponse = await app.inject({
      method: "POST",
      url: "/setups",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Breakout",
        description: "Primary breakout setup",
      },
    });

    assert.equal(firstResponse.statusCode, 201);

    const secondResponse = await app.inject({
      method: "POST",
      url: "/setups",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: " breakout ",
        description: "Duplicate breakout setup",
      },
    });

    assert.equal(secondResponse.statusCode, 409);
    const payload = secondResponse.json();
    assert.equal(payload.error.code, "SETUP_NAME_TAKEN");
    assert.equal(payload.error.message, "Setup names must be unique.");
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

test("daily review creation rejects duplicate review dates for the same user", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `dr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);

    const firstResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "daily",
        reviewDate: "2026-03-21",
        lessonLearned: "First daily review",
      },
    });

    assert.equal(firstResponse.statusCode, 201);

    const secondResponse = await app.inject({
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

    assert.equal(secondResponse.statusCode, 409);
    const payload = secondResponse.json();
    assert.equal(payload.error.code, "DAILY_REVIEW_EXISTS");
    assert.equal(payload.error.message, "A daily review already exists for this date.");
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

test("weekly review creation rejects duplicate review weeks for the same user", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `wr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);

    const firstResponse = await app.inject({
      method: "POST",
      url: "/reviews",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        type: "weekly",
        weekStart: "2026-03-16",
        weekEnd: "2026-03-22",
        weeklySummary: "First weekly review",
      },
    });

    assert.equal(firstResponse.statusCode, 201);

    const secondResponse = await app.inject({
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

    assert.equal(secondResponse.statusCode, 409);
    const payload = secondResponse.json();
    assert.equal(payload.error.code, "WEEKLY_REVIEW_EXISTS");
    assert.equal(payload.error.message, "A weekly review already exists for this week.");
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
