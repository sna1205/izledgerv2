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

test("registration rejects usernames that differ only by case", async () => {
  await prisma.$connect();

  const app = await buildApp();
  const baseUsername = `User${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const password = "Password123!";

  try {
    const firstResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: baseUsername,
        password,
      },
    });

    assert.equal(firstResponse.statusCode, 201);

    const secondResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: baseUsername.toLowerCase(),
        password,
      },
    });

    assert.equal(secondResponse.statusCode, 409);
    const payload = secondResponse.json();
    assert.equal(payload.error.code, "USERNAME_TAKEN");
    assert.equal(payload.error.message, "Username already exists.");
  } finally {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username: {
          equals: baseUsername,
          mode: "insensitive",
        },
      },
    });
    await prisma.$disconnect();
  }
});
