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

test("checklist rules reject duplicate normalized titles within the same exact scope but allow reuse across scopes", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `cr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

  try {
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username, password },
    });

    assert.equal(registerResponse.statusCode, 201);
    const sessionCookie = getSessionCookie(registerResponse.headers["set-cookie"]);

    const accountResponse = await app.inject({
      method: "POST",
      url: "/accounts",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Checklist Account",
        broker: "Manual",
        type: "Personal",
        balance: 1000,
        currency: "USD",
      },
    });

    assert.equal(accountResponse.statusCode, 201);
    const accountId = accountResponse.json().account.id as string;

    const setupResponse = await app.inject({
      method: "POST",
      url: "/setups",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Checklist Setup",
        description: "Checklist setup scope",
      },
    });

    assert.equal(setupResponse.statusCode, 201);
    const setupId = setupResponse.json().setup.id as string;

    const firstRuleResponse = await app.inject({
      method: "POST",
      url: "/checklist-rules",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        title: " Wait for confirmation ",
        description: "First scoped rule",
        isRequired: true,
        isActive: true,
        accountId,
        setupId,
      },
    });

    assert.equal(firstRuleResponse.statusCode, 201);
    const firstRuleId = firstRuleResponse.json().rule.id as string;

    const duplicateRuleResponse = await app.inject({
      method: "POST",
      url: "/checklist-rules",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        title: "wait   for   confirmation",
        description: "Duplicate scoped rule",
        isRequired: false,
        isActive: true,
        accountId,
        setupId,
      },
    });

    assert.equal(duplicateRuleResponse.statusCode, 409);
    assert.equal(duplicateRuleResponse.json().error.code, "CHECKLIST_RULE_TITLE_TAKEN");
    assert.equal(duplicateRuleResponse.json().error.message, "Checklist rule titles must be unique within the same scope.");

    const differentScopeResponse = await app.inject({
      method: "POST",
      url: "/checklist-rules",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        title: "wait for confirmation",
        description: "Allowed in global scope",
        isRequired: false,
        isActive: true,
      },
    });

    assert.equal(differentScopeResponse.statusCode, 201);

    const updateCollisionResponse = await app.inject({
      method: "PUT",
      url: `/checklist-rules/${firstRuleId}`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        title: "wait for confirmation",
        description: "Still collides when updating in same scope",
        isRequired: true,
        isActive: true,
        accountId,
        setupId,
      },
    });

    assert.equal(updateCollisionResponse.statusCode, 200);

    const secondScopedRuleResponse = await app.inject({
      method: "POST",
      url: "/checklist-rules",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        title: "Capture chart",
        description: "Second scoped rule",
        isRequired: false,
        isActive: true,
        accountId,
        setupId,
      },
    });

    assert.equal(secondScopedRuleResponse.statusCode, 201);
    const secondRuleId = secondScopedRuleResponse.json().rule.id as string;

    const updateToDuplicateResponse = await app.inject({
      method: "PUT",
      url: `/checklist-rules/${secondRuleId}`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        title: " WAIT FOR CONFIRMATION ",
        description: "Should collide with the first scoped rule",
        isRequired: false,
        isActive: true,
        accountId,
        setupId,
      },
    });

    assert.equal(updateToDuplicateResponse.statusCode, 409);
    assert.equal(updateToDuplicateResponse.json().error.code, "CHECKLIST_RULE_TITLE_TAKEN");
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
