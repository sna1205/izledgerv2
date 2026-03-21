import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:3000";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5432/izledger";

const [{ buildApp }, { prisma }, { ensureFounderAccount }] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/prisma.js"),
  import("../src/modules/founder/bootstrap.js"),
]);

test("founder bootstrap creates the founder account with a default account", async (t) => {
  try {
    await prisma.$connect();
  } catch {
    t.skip("PostgreSQL is not reachable on DATABASE_URL. Start the local database to run this integration test.");
    return;
  }

  const founderPassword = "FounderSeedPassword123!";
  const app = await buildApp();

  try {
    const existingFounder = await prisma.user.findFirst({
      where: {
        username: {
          equals: "VEASNA",
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingFounder) {
      t.skip("Founder bootstrap test skipped because a founder user already exists in the configured database.");
      return;
    }

    const result = await ensureFounderAccount({
      enabled: true,
      password: founderPassword,
    });

    assert.equal(result.status, "created");

    const founder = await prisma.user.findFirst({
      where: {
        username: {
          equals: "VEASNA",
          mode: "insensitive",
        },
      },
      include: {
        accounts: true,
      },
    });

    assert.ok(founder);
    assert.equal(founder.username, "VEASNA");
    assert.equal(founder.accounts.length, 1);
    assert.equal(founder.accounts[0]?.isDefault, true);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        username: "VEASNA",
        password: founderPassword,
      },
    });

    assert.equal(loginResponse.statusCode, 200);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username: {
          equals: "VEASNA",
          mode: "insensitive",
        },
      },
    });
    await prisma.$disconnect();
  }
});

test("founder bootstrap resets the founder password and ensures the canonical username", async (t) => {
  try {
    await prisma.$connect();
  } catch {
    t.skip("PostgreSQL is not reachable on DATABASE_URL. Start the local database to run this integration test.");
    return;
  }

  const app = await buildApp();
  const initialPassword = "InitialFounderPassword123!";
  const nextPassword = "ResetFounderPassword123!";

  try {
    const existingFounder = await prisma.user.findFirst({
      where: {
        username: {
          equals: "VEASNA",
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (existingFounder) {
      t.skip("Founder bootstrap reset test skipped because a founder user already exists in the configured database.");
      return;
    }

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: "Veasna",
        password: initialPassword,
      },
    });

    assert.equal(registerResponse.statusCode, 201);

    const bootstrapResult = await ensureFounderAccount({
      enabled: true,
      password: nextPassword,
    });

    assert.equal(bootstrapResult.status, "synced");

    const founder = await prisma.user.findFirst({
      where: {
        username: {
          equals: "VEASNA",
          mode: "insensitive",
        },
      },
      include: {
        accounts: true,
      },
    });

    assert.ok(founder);
    assert.equal(founder.username, "VEASNA");
    assert.ok(founder.accounts.length >= 1);

    const oldLoginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        username: "VEASNA",
        password: initialPassword,
      },
    });

    assert.equal(oldLoginResponse.statusCode, 401);

    const nextLoginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        username: "VEASNA",
        password: nextPassword,
      },
    });

    assert.equal(nextLoginResponse.statusCode, 200);
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username: {
          equals: "VEASNA",
          mode: "insensitive",
        },
      },
    });
    await prisma.$disconnect();
  }
});
