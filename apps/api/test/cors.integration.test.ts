import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.STORAGE_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.APP_URL = "http://localhost:5173";
process.env.API_URL = "http://localhost:4000";
process.env.CORS_ALLOWED_ORIGINS = "http://localhost:5173";
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/izledger_test";

const [{ buildApp }, { prisma }] = await Promise.all([
  import("../src/app.js"),
  import("../src/lib/prisma.js"),
]);

test("cors allows the configured local frontend origin", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/live",
      headers: {
        origin: "http://localhost:5173",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["access-control-allow-origin"], "http://localhost:5173");
    assert.equal(response.headers["access-control-allow-credentials"], "true");
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
});

test("cors rejects unexpected local origins", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/live",
      headers: {
        origin: "http://127.0.0.1:5173",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["access-control-allow-origin"], undefined);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
});
