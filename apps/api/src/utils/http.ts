import { ZodType } from "zod";
import { AppError } from "./errors.js";

export function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Request validation failed.", parsed.error.flatten());
  }

  return parsed.data;
}

export function buildPagination(page: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
