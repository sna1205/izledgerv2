import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5432/izledger";

const [{ buildApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/prisma.js"),
]);

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(rawCookie, "Expected auth response to set a session cookie.");
  return rawCookie.split(";", 1)[0];
}

test("founder routes only allow the founder username", async (t) => {
  try {
    await prisma.$connect();
  } catch {
    t.skip("PostgreSQL is not reachable on DATABASE_URL. Start the local database to run this integration test.");
    return;
  }

  const app = await buildApp();
  const founderPassword = "TemporaryPassword123!";
  const memberUsername = `member${Date.now().toString(36)}`;
  const memberPassword = "MemberPassword123!";
  let createdFounder = false;

  try {
    const existingFounder = await prisma.user.findFirst({
      where: {
        username: "VEASNA",
      },
      select: {
        id: true,
      },
    });

    if (existingFounder) {
      t.skip("Founder access test skipped because a VEASNA user already exists in the configured database.");
      return;
    }

    const founderRegisterResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: "VEASNA",
        password: founderPassword,
      },
    });

    assert.equal(founderRegisterResponse.statusCode, 201);
    createdFounder = true;

    const memberRegisterResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: memberUsername,
        password: memberPassword,
      },
    });

    assert.equal(memberRegisterResponse.statusCode, 201);

    const founderSessionCookie = getSessionCookie(founderRegisterResponse.headers["set-cookie"]);
    const memberSessionCookie = getSessionCookie(memberRegisterResponse.headers["set-cookie"]);

    const founderStatsResponse = await app.inject({
      method: "GET",
      url: "/founder/stats",
      headers: {
        cookie: founderSessionCookie,
      },
    });

    assert.equal(founderStatsResponse.statusCode, 200);
    assert.deepEqual(Object.keys(founderStatsResponse.json().stats).sort(), [
      "totalAccounts",
      "totalReviews",
      "totalTrades",
      "totalUsers",
    ]);

    const founderHealthResponse = await app.inject({
      method: "GET",
      url: "/founder/health",
      headers: {
        cookie: founderSessionCookie,
      },
    });

    assert.equal(founderHealthResponse.statusCode, 200);
    assert.equal(founderHealthResponse.json().sessionValid, true);

    const memberStatsResponse = await app.inject({
      method: "GET",
      url: "/founder/stats",
      headers: {
        cookie: memberSessionCookie,
      },
    });

    assert.equal(memberStatsResponse.statusCode, 403);
    assert.equal(memberStatsResponse.json().error.code, "FORBIDDEN");
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username: {
          in: createdFounder ? ["VEASNA", memberUsername] : [memberUsername],
        },
      },
    });
    await prisma.$disconnect();
  }
});

test("founder routes allow founder access regardless of username casing", async (t) => {
  try {
    await prisma.$connect();
  } catch {
    t.skip("PostgreSQL is not reachable on DATABASE_URL. Start the local database to run this integration test.");
    return;
  }

  const app = await buildApp();
  const founderUsername = "Veasna";
  const founderPassword = "TemporaryPassword123!";

  try {
    const existingFounder = await prisma.user.findFirst({
      where: {
        username: {
          equals: founderUsername,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingFounder) {
      t.skip("Founder case-sensitivity test skipped because a Veasna user already exists in the configured database.");
      return;
    }

    const founderRegisterResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: founderUsername,
        password: founderPassword,
      },
    });

    assert.equal(founderRegisterResponse.statusCode, 201);

    const founderSessionCookie = getSessionCookie(founderRegisterResponse.headers["set-cookie"]);
    const founderStatsResponse = await app.inject({
      method: "GET",
      url: "/founder/stats",
      headers: {
        cookie: founderSessionCookie,
      },
    });

    assert.equal(founderStatsResponse.statusCode, 200);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username: {
          equals: founderUsername,
          mode: "insensitive",
        },
      },
    });
    await prisma.$disconnect();
  }
});
