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

test("liveness endpoints stay up without probing the database", async () => {
  const app = await buildApp();
  const originalQueryRaw = prisma.$queryRaw;
  let queryCount = 0;

  Object.defineProperty(prisma, "$queryRaw", {
    value: async () => {
      queryCount += 1;
      return [{ ok: 1 }];
    },
    configurable: true,
  });

  try {
    const liveResponse = await app.inject({
      method: "GET",
      url: "/live",
    });

    assert.equal(liveResponse.statusCode, 200);
    assert.equal(liveResponse.json().status, "ok");
    assert.equal(liveResponse.json().database, "unchecked");
    assert.equal(queryCount, 0);

    const healthResponse = await app.inject({
      method: "GET",
      url: "/health",
    });

    assert.equal(healthResponse.statusCode, 200);
    assert.equal(healthResponse.json().status, "ok");
    assert.equal(healthResponse.json().database, "unchecked");
    assert.equal(queryCount, 0);

    const readyResponse = await app.inject({
      method: "GET",
      url: "/ready",
    });

    assert.equal(readyResponse.statusCode, 200);
    assert.equal(readyResponse.json().status, "ok");
    assert.equal(readyResponse.json().database, "ok");
    assert.equal(queryCount, 1);
  } finally {
    Object.defineProperty(prisma, "$queryRaw", {
      value: originalQueryRaw,
      configurable: true,
    });
    await app.close();
  }
});

test("readiness reports database failures without taking down liveness", async () => {
  const app = await buildApp();
  const originalQueryRaw = prisma.$queryRaw;

  Object.defineProperty(prisma, "$queryRaw", {
    value: async () => {
      throw new Error("database offline");
    },
    configurable: true,
  });

  try {
    const readyResponse = await app.inject({
      method: "GET",
      url: "/ready",
    });

    assert.equal(readyResponse.statusCode, 503);
    assert.equal(readyResponse.json().status, "error");
    assert.equal(readyResponse.json().database, "unavailable");

    const liveResponse = await app.inject({
      method: "GET",
      url: "/live",
    });

    assert.equal(liveResponse.statusCode, 200);
    assert.equal(liveResponse.json().status, "ok");
    assert.equal(liveResponse.json().database, "unchecked");
  } finally {
    Object.defineProperty(prisma, "$queryRaw", {
      value: originalQueryRaw,
      configurable: true,
    });
    await app.close();
  }
});
