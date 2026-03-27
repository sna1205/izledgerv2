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

const defaultPassword = "Password123!";

function getSessionCookie(setCookieHeader: string | string[] | undefined) {
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  assert.ok(rawCookie, "Expected auth response to set a session cookie.");
  return rawCookie.split(";", 1)[0];
}

async function registerAndGetSession(app: Awaited<ReturnType<typeof buildApp>>, username: string, password = defaultPassword) {
  const registerResponse = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username,
      password,
    },
  });

  assert.equal(registerResponse.statusCode, 201);

  return getSessionCookie(registerResponse.headers["set-cookie"]);
}

async function createAccount(app: Awaited<ReturnType<typeof buildApp>>, sessionCookie: string, name: string) {
  const createAccountResponse = await app.inject({
    method: "POST",
    url: "/accounts",
    headers: {
      cookie: sessionCookie,
    },
    payload: {
      name,
      broker: "Manual",
      type: "Personal",
      balance: 1000,
      currency: "USD",
    },
  });

  assert.equal(createAccountResponse.statusCode, 201);
  return createAccountResponse.json().account.id as string;
}

async function createTrade(app: Awaited<ReturnType<typeof buildApp>>, sessionCookie: string, accountId: string, today: string, notes: string) {
  const createTradeResponse = await app.inject({
    method: "POST",
    url: "/trades",
    headers: {
      cookie: sessionCookie,
    },
    payload: {
      date: today,
      accountId,
      pair: "GBPUSD",
      direction: "Sell",
      entry: 1.2745,
      stopLoss: 1.28,
      takeProfit: 1.26,
      profit: -42.5,
      result: "Loss",
      notes,
    },
  });

  assert.equal(createTradeResponse.statusCode, 201);
  return createTradeResponse.json().trade.id as string;
}

test("account deletion remains blocked when only soft-deleted trades remain", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `ad${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const sessionCookie = await registerAndGetSession(app, username);
    const targetAccountId = await createAccount(app, sessionCookie, "Delete Target");
    const tradeId = await createTrade(app, sessionCookie, targetAccountId, today, "Soft delete account protection");

    const deleteTradeResponse = await app.inject({
      method: "DELETE",
      url: `/trades/${tradeId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(deleteTradeResponse.statusCode, 204);

    const deleteAccountResponse = await app.inject({
      method: "DELETE",
      url: `/accounts/${targetAccountId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(deleteAccountResponse.statusCode, 409);
    const payload = deleteAccountResponse.json();
    assert.equal(payload.error.code, "ACCOUNT_IN_USE");
    assert.equal(payload.error.message, "Account cannot be deleted because trades still reference it. Archive the account instead.");

    const stillExists = await prisma.account.findUnique({
      where: {
        id: targetAccountId,
      },
    });

    assert.ok(stillExists, "Expected account to remain when soft-deleted trades still reference it.");
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

test("account deletion remains blocked when active trades exist", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `ad${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const sessionCookie = await registerAndGetSession(app, username);
    const targetAccountId = await createAccount(app, sessionCookie, "Delete Target");
    await createTrade(app, sessionCookie, targetAccountId, today, "Active trade account protection");

    const deleteAccountResponse = await app.inject({
      method: "DELETE",
      url: `/accounts/${targetAccountId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(deleteAccountResponse.statusCode, 409);
    const payload = deleteAccountResponse.json();
    assert.equal(payload.error.code, "ACCOUNT_IN_USE");
    assert.equal(payload.error.message, "Account cannot be deleted because trades still reference it. Archive the account instead.");

    const stillExists = await prisma.account.findUnique({
      where: {
        id: targetAccountId,
      },
    });

    assert.ok(stillExists, "Expected account to remain when active trades exist.");
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

test("account with no trades can be deleted", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `ad${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  try {
    const sessionCookie = await registerAndGetSession(app, username);
    const targetAccountId = await createAccount(app, sessionCookie, "No Trades");

    const deleteAccountResponse = await app.inject({
      method: "DELETE",
      url: `/accounts/${targetAccountId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(deleteAccountResponse.statusCode, 204);

    const deletedAccount = await prisma.account.findUnique({
      where: {
        id: targetAccountId,
      },
    });

    assert.equal(deletedAccount, null);
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

test("user cannot delete another user's account", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const usernameA = `ad${Date.now().toString(36)}a${Math.random().toString(36).slice(2, 5)}`;
  const usernameB = `ad${Date.now().toString(36)}b${Math.random().toString(36).slice(2, 5)}`;

  try {
    const ownerSessionCookie = await registerAndGetSession(app, usernameA);
    const attackerSessionCookie = await registerAndGetSession(app, usernameB);
    const targetAccountId = await createAccount(app, ownerSessionCookie, "Private Account");

    const deleteAccountResponse = await app.inject({
      method: "DELETE",
      url: `/accounts/${targetAccountId}`,
      headers: {
        cookie: attackerSessionCookie,
      },
    });

    assert.equal(deleteAccountResponse.statusCode, 404);
    const payload = deleteAccountResponse.json();
    assert.equal(payload.error.code, "ACCOUNT_NOT_FOUND");
    assert.equal(payload.error.message, "Account not found.");

    const account = await prisma.account.findUnique({
      where: {
        id: targetAccountId,
      },
    });

    assert.ok(account, "Expected the target account to remain when another user tries to delete it.");
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username: {
          in: [usernameA, usernameB],
        },
      },
    });
    await prisma.$disconnect();
  }
});

test("deleting one account does not affect other accounts", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const username = `ad${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  try {
    const sessionCookie = await registerAndGetSession(app, username);
    const originalDefaultAccountId = await createAccount(app, sessionCookie, "Primary Default");
    const deletedAccountId = await createAccount(app, sessionCookie, "Delete Me");
    const remainingAccountId = await createAccount(app, sessionCookie, "Keep Me");

    const deleteAccountResponse = await app.inject({
      method: "DELETE",
      url: `/accounts/${deletedAccountId}`,
      headers: {
        cookie: sessionCookie,
      },
    });

    assert.equal(deleteAccountResponse.statusCode, 204);

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

    assert.equal(accounts.some((account) => account.id === deletedAccountId), false);
    assert.equal(accounts.some((account) => account.id === originalDefaultAccountId), true);
    assert.equal(accounts.some((account) => account.id === remainingAccountId), true);
    assert.equal(accounts.length, 2);
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
