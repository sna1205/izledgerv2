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

test("cannot unset the only default account", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `df${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
    const defaultAccount = await prisma.account.findFirst({
      where: {
        user: {
          username,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    assert.ok(defaultAccount, "Expected the default account created during registration.");

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/accounts/${defaultAccount.id}`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        isDefault: false,
      },
    });

    assert.equal(updateResponse.statusCode, 409);
    const payload = updateResponse.json();
    assert.equal(payload.error.code, "DEFAULT_ACCOUNT_REQUIRED");
    assert.equal(payload.error.message, "You must have at least one default account");
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

test("promoting a new default account clears the previous default", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `dx${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
    const initialDefault = await prisma.account.findFirst({
      where: {
        user: {
          username,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    assert.ok(initialDefault, "Expected the default account created during registration.");

    const createAccountResponse = await app.inject({
      method: "POST",
      url: "/accounts",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Secondary Account",
        broker: "Manual",
        type: "Personal",
        balance: 500,
        currency: "USD",
      },
    });

    assert.equal(createAccountResponse.statusCode, 201);

    const secondaryAccountId = createAccountResponse.json().account.id as string;

    const promoteResponse = await app.inject({
      method: "PATCH",
      url: `/accounts/${secondaryAccountId}`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        isDefault: true,
      },
    });

    assert.equal(promoteResponse.statusCode, 200);
    assert.equal(promoteResponse.json().account.isDefault, true);

    const accounts = await prisma.account.findMany({
      where: {
        user: {
          username,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const defaultAccounts = accounts.filter((account) => account.isDefault);

    assert.equal(defaultAccounts.length, 1);
    assert.equal(defaultAccounts[0]?.id, secondaryAccountId);
    assert.equal(accounts.find((account) => account.id === initialDefault.id)?.isDefault, false);
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

test("archiving the default account promotes the next active account and hides the archived account from active listings", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `da${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
    const initialDefault = await prisma.account.findFirst({
      where: {
        user: {
          username,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    assert.ok(initialDefault, "Expected the default account created during registration.");

    const createAccountResponse = await app.inject({
      method: "POST",
      url: "/accounts",
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        name: "Secondary Account",
        broker: "Manual",
        type: "Personal",
        balance: 500,
        currency: "USD",
      },
    });

    assert.equal(createAccountResponse.statusCode, 201);
    const secondaryAccountId = createAccountResponse.json().account.id as string;

    const archiveResponse = await app.inject({
      method: "PATCH",
      url: `/accounts/${initialDefault.id}`,
      headers: {
        cookie: sessionCookie,
      },
      payload: {
        isArchived: true,
      },
    });

    assert.equal(archiveResponse.statusCode, 200);
    assert.equal(archiveResponse.json().account.isArchived, true);
    assert.equal(archiveResponse.json().account.isDefault, false);

    const activeListResponse = await app.inject({
      method: "GET",
      url: "/accounts",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(activeListResponse.statusCode, 200);
    assert.deepEqual(
      activeListResponse.json().items.map((account: { id: string }) => account.id),
      [secondaryAccountId],
    );

    const allListResponse = await app.inject({
      method: "GET",
      url: "/accounts?status=all",
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(allListResponse.statusCode, 200);
    assert.equal(allListResponse.json().items.length, 2);

    const accounts = await prisma.account.findMany({
      where: {
        user: {
          username,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    assert.equal(accounts.find((account) => account.id === initialDefault.id)?.isArchived, true);
    assert.equal(accounts.find((account) => account.id === initialDefault.id)?.isDefault, false);
    assert.equal(accounts.find((account) => account.id === secondaryAccountId)?.isDefault, true);
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
