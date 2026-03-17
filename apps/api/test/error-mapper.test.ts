import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { AppError, toAppError, toErrorResponse } from "../src/utils/errors.js";

test("prisma known request errors are mapped to sanitized client-safe errors", () => {
  const prismaError = new Prisma.PrismaClientKnownRequestError(
    'P2003 on host db.internal.local while running SQL: DELETE FROM "accounts"',
    {
      code: "P2003",
      clientVersion: "test",
    },
  );

  const mapped = toAppError(prismaError);

  assert.ok(mapped instanceof AppError);
  assert.equal(mapped.statusCode, 400);
  assert.equal(mapped.code, "DATABASE_CONSTRAINT_VIOLATION");
  assert.equal(mapped.message, "Database constraint violation");
  assert.equal(mapped.details, undefined);
  assert.equal(mapped.message.includes("P2003"), false);
  assert.equal(mapped.message.includes("db.internal.local"), false);
  assert.equal(mapped.message.includes("DELETE FROM"), false);
});

test("unknown prisma errors are mapped to generic database errors", () => {
  const prismaError = new Prisma.PrismaClientKnownRequestError("Raw SQL details", {
    code: "P9999",
    clientVersion: "test",
  });

  const mapped = toAppError(prismaError);

  assert.ok(mapped instanceof AppError);
  assert.equal(mapped.statusCode, 500);
  assert.equal(mapped.code, "DATABASE_ERROR");
  assert.equal(mapped.message, "A database error occurred.");
});

test("error responses are serialized with a stable details array", () => {
  const response = toErrorResponse(new AppError(400, "VALIDATION_ERROR", "Invalid request", [
    { field: "username", message: "Required" },
  ]));

  assert.deepEqual(response, {
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid request",
      details: [
        { field: "username", message: "Required" },
      ],
    },
  });
});

test("generic framework status errors are mapped without leaking raw payloads", () => {
  const mapped = toAppError({
    statusCode: 429,
    message: "Rate limit exceeded, retry in 1 minute",
  });

  assert.ok(mapped instanceof AppError);
  assert.equal(mapped.statusCode, 429);
  assert.equal(mapped.code, "RATE_LIMIT_EXCEEDED");
  assert.equal(mapped.message, "Too many requests.");
  assert.deepEqual(mapped.details, undefined);
});
