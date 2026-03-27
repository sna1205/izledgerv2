import { ZodType, ZodTypeDef } from "zod";
import { AppError, ErrorDetail } from "./errors.js";

function formatZodIssues(value: {
  issues: Array<{ path: Array<string | number>; message: string }>;
}): ErrorDetail[] {
  return value.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : undefined,
    message: issue.message,
  }));
}

export function parseOrThrow<T>(schema: ZodType<T, ZodTypeDef, unknown>, value: unknown): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request", formatZodIssues(parsed.error));
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
