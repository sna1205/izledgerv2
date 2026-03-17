import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { AppError, toAppError } from "../src/utils/errors.js";

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
