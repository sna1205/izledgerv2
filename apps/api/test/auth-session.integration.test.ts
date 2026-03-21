import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";

const [{ buildApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/prisma.js"),
]);

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(rawCookie, "Expected auth response to set a session cookie.");
  return rawCookie.split(";", 1)[0];
}

test("register/login issue an HTTP-only session cookie and logout clears it", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `au${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

    const registerCookieHeader = Array.isArray(registerResponse.headers["set-cookie"])
      ? registerResponse.headers["set-cookie"][0]
      : registerResponse.headers["set-cookie"];

    assert.ok(registerCookieHeader?.includes("HttpOnly"));
    assert.ok(registerCookieHeader?.includes("SameSite=Lax"));
    assert.ok(registerCookieHeader?.includes("Path=/"));

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: {
        cookie: getSessionCookie(registerResponse.headers["set-cookie"]),
      },
    });

    assert.equal(logoutResponse.statusCode, 204);

    const logoutCookieHeader = Array.isArray(logoutResponse.headers["set-cookie"])
      ? logoutResponse.headers["set-cookie"][0]
      : logoutResponse.headers["set-cookie"];

    assert.ok(logoutCookieHeader?.includes("HttpOnly"));
    assert.ok(logoutCookieHeader?.includes("SameSite=Lax"));
    assert.ok(
      logoutCookieHeader?.includes("Max-Age=0") || logoutCookieHeader?.includes("Expires="),
      "Expected logout to clear the session cookie.",
    );
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
