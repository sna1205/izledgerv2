import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5432/izledger";
process.env.AUTH_RATE_LIMIT_MAX = "1";
process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES = "1";

const [{ buildApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/prisma.js"),
]);

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(rawCookie, "Expected auth response to set a session cookie.");
  return rawCookie.split(";", 1)[0];
}

function assertErrorShape(
  payload: any,
  expected: { code: string; message: string },
) {
  assert.deepEqual(Object.keys(payload), ["error"]);
  assert.equal(payload.error.code, expected.code);
  assert.equal(payload.error.message, expected.message);
  assert.ok(Array.isArray(payload.error.details));
}

test("validation failures use the standard error envelope", async () => {
  const app = await buildApp();

  try {
    const validationResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: "",
      },
    });

    assert.equal(validationResponse.statusCode, 400);
    assertErrorShape(validationResponse.json(), {
      code: "VALIDATION_ERROR",
      message: "Invalid request",
    });
    assert.ok(validationResponse.json().error.details.some((detail: { field?: string }) => detail.field === "username"));
    assert.ok(validationResponse.json().error.details.some((detail: { field?: string }) => detail.field === "password"));
  } finally {
    await app.close();
  }
});

test("route plugin failures also use the standard error envelope", async () => {
  const app = await buildApp();
  const originalFindFirst = prisma.user.findFirst;

  Object.defineProperty(prisma.user, "findFirst", {
    value: async () => {
      throw new Error("sensitive database details");
    },
    configurable: true,
  });

  try {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: "Demo",
        password: "Password123!",
      },
    });

    assert.equal(response.statusCode, 500);
    assertErrorShape(response.json(), {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error.",
    });
  } finally {
    Object.defineProperty(prisma.user, "findFirst", {
      value: originalFindFirst,
      configurable: true,
    });
    await app.close();
  }
});

test("unauthorized and not found responses use the standard error envelope", async () => {
  const app = await buildApp();

  try {
    const unauthorizedResponse = await app.inject({
      method: "GET",
      url: "/auth/me",
    });

    assert.equal(unauthorizedResponse.statusCode, 401);
    assertErrorShape(unauthorizedResponse.json(), {
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });

    const notFoundResponse = await app.inject({
      method: "GET",
      url: "/missing-route",
    });

    assert.equal(notFoundResponse.statusCode, 404);
    assertErrorShape(notFoundResponse.json(), {
      code: "NOT_FOUND",
      message: "Resource not found.",
    });
  } finally {
    await app.close();
  }
});

test("invalid params and ownership failures use the standard error envelope", async (t) => {
  try {
    await prisma.$connect();
  } catch {
    t.skip("PostgreSQL is not reachable on DATABASE_URL. Start the local database to run this integration test.");
    return;
  }

  const ownerApp = await buildApp();
  const attackerApp = await buildApp();
  const routeApp = await buildApp();
  const ownerUsername = `erp${Date.now().toString(36)}a${Math.random().toString(36).slice(2, 5)}`;
  const attackerUsername = `erp${Date.now().toString(36)}b${Math.random().toString(36).slice(2, 5)}`;
  const password = "Password123!";

  try {
    const ownerRegisterResponse = await ownerApp.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: ownerUsername,
        password,
      },
    });

    assert.equal(ownerRegisterResponse.statusCode, 201);
    const ownerSessionCookie = getSessionCookie(ownerRegisterResponse.headers["set-cookie"]);

    const attackerRegisterResponse = await attackerApp.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: attackerUsername,
        password,
      },
    });

    assert.equal(attackerRegisterResponse.statusCode, 201);
    const attackerSessionCookie = getSessionCookie(attackerRegisterResponse.headers["set-cookie"]);

    const createAccountResponse = await routeApp.inject({
      method: "POST",
      url: "/accounts",
      headers: {
        cookie: ownerSessionCookie,
      },
      payload: {
        name: "Private Account",
        broker: "Manual",
        type: "Personal",
        balance: 1000,
        currency: "USD",
      },
    });

    assert.equal(createAccountResponse.statusCode, 201);
    const targetAccountId = createAccountResponse.json().account.id as string;

    const invalidParamsResponse = await routeApp.inject({
      method: "DELETE",
      url: "/accounts/not-a-uuid",
      headers: {
        cookie: ownerSessionCookie,
      },
    });

    assert.equal(invalidParamsResponse.statusCode, 400);
    assertErrorShape(invalidParamsResponse.json(), {
      code: "VALIDATION_ERROR",
      message: "Invalid request",
    });
    assert.ok(invalidParamsResponse.json().error.details.some((detail: { field?: string }) => detail.field === "id"));

    const ownershipFailureResponse = await routeApp.inject({
      method: "DELETE",
      url: `/accounts/${targetAccountId}`,
      headers: {
        cookie: attackerSessionCookie,
      },
    });

    assert.equal(ownershipFailureResponse.statusCode, 404);
    assertErrorShape(ownershipFailureResponse.json(), {
      code: "ACCOUNT_NOT_FOUND",
      message: "Account not found.",
    });
  } finally {
    await ownerApp.close();
    await attackerApp.close();
    await routeApp.close();
    await prisma.user.deleteMany({
      where: {
        username: {
          in: [ownerUsername, attackerUsername],
        },
      },
    });
    await prisma.$disconnect();
  }
});

test("conflict and rate limit responses use the standard error envelope", async (t) => {
  try {
    await prisma.$connect();
  } catch {
    t.skip("PostgreSQL is not reachable on DATABASE_URL. Start the local database to run this integration test.");
    return;
  }

  const app = await buildApp();
  const username = `er${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const password = "Password123!";

  try {
    const firstRegisterResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username,
        password,
      },
    });

    assert.equal(firstRegisterResponse.statusCode, 201);

    const conflictApp = await buildApp();
    try {
      const conflictResponse = await conflictApp.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          username,
          password,
        },
      });

      assert.equal(conflictResponse.statusCode, 409);
      assertErrorShape(conflictResponse.json(), {
        code: "USERNAME_TAKEN",
        message: "Username already exists.",
      });
    } finally {
      await conflictApp.close();
    }

    const rateLimitedApp = await buildApp();
    try {
      const firstLoginResponse = await rateLimitedApp.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          username,
          password,
        },
      });

      assert.equal(firstLoginResponse.statusCode, 200);

      const secondLoginResponse = await rateLimitedApp.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          username,
          password,
        },
      });

      assert.equal(secondLoginResponse.statusCode, 429);
      assertErrorShape(secondLoginResponse.json(), {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests.",
      });
    } finally {
      await rateLimitedApp.close();
    }
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

test("internal server errors use the standard error envelope", async () => {
  const app = await buildApp();
  app.get("/__test__/boom", async () => {
    throw new Error("sensitive stack details");
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/__test__/boom",
    });

    assert.equal(response.statusCode, 500);
    assertErrorShape(response.json(), {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error.",
    });
  } finally {
    await app.close();
  }
});
