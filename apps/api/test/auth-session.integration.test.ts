import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.APP_URL ??= "https://app.example.com";
process.env.API_URL ??= "https://api.example.com";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";
process.env.SESSION_COOKIE_SAME_SITE ??= "none";
process.env.SESSION_COOKIE_SECURE ??= "true";
process.env.COOKIE_DOMAIN ??= ".example.com";

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
    assert.ok(registerCookieHeader?.includes("SameSite=None"));
    assert.ok(registerCookieHeader?.includes("Secure"));
    assert.ok(registerCookieHeader?.includes("Path=/"));
    assert.ok(registerCookieHeader?.includes("Domain=.example.com"));

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
    assert.ok(logoutCookieHeader?.includes("SameSite=None"));
    assert.ok(logoutCookieHeader?.includes("Secure"));
    assert.ok(logoutCookieHeader?.includes("Domain=.example.com"));
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

test("cors allows the production frontend origin and credentials", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/auth/login",
      headers: {
        origin: "https://app.example.com",
        "access-control-request-method": "POST",
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], "https://app.example.com");
    assert.equal(response.headers["access-control-allow-credentials"], "true");
  } finally {
    await app.close();
  }
});
