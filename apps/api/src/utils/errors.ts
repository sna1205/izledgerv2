import { Prisma } from "@prisma/client";

export type ErrorDetail = {
  field?: string;
  message: string;
};

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: ErrorDetail[];

  constructor(statusCode: number, code: string, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function isErrorWithStatusCode(error: unknown): error is { statusCode: number; message?: string; validation?: Array<{ instancePath?: string; message?: string; params?: { missingProperty?: string } }> } {
  return typeof error === "object" && error !== null && "statusCode" in error && typeof (error as { statusCode?: unknown }).statusCode === "number";
}

function formatFastifyValidationDetails(
  validation: Array<{ instancePath?: string; message?: string; params?: { missingProperty?: string } }>,
): ErrorDetail[] {
  return validation.map((issue) => {
    const instancePath = issue.instancePath?.replace(/^\//, "").replace(/\//g, ".");
    const missingProperty = issue.params?.missingProperty;
    const field = instancePath || missingProperty || undefined;

    return {
      field,
      message: issue.message ?? "Invalid request.",
    };
  });
}

export function toErrorResponse(appError: AppError) {
  return {
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details ?? [],
    },
  };
}

export function toAppError(error: unknown): AppError | null {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || error.code === "P2003") {
      return new AppError(400, "DATABASE_CONSTRAINT_VIOLATION", "Database constraint violation");
    }

    if (error.code === "P2025") {
      return new AppError(404, "NOT_FOUND", "The requested record was not found.");
    }

    return new AppError(500, "DATABASE_ERROR", "A database error occurred.");
  }

  if (
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return new AppError(500, "DATABASE_ERROR", "A database error occurred.");
  }

  if (isErrorWithStatusCode(error)) {
    if (Array.isArray(error.validation) && error.validation.length > 0) {
      return new AppError(400, "VALIDATION_ERROR", "Invalid request", formatFastifyValidationDetails(error.validation));
    }

    if (error.statusCode === 400) {
      return new AppError(400, "BAD_REQUEST", "Invalid request");
    }

    if (error.statusCode === 401) {
      return new AppError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error.statusCode === 403) {
      return new AppError(403, "FORBIDDEN", "Forbidden.");
    }

    if (error.statusCode === 404) {
      return new AppError(404, "NOT_FOUND", "Resource not found.");
    }

    if (error.statusCode === 409) {
      return new AppError(409, "CONFLICT", "Conflict.");
    }

    if (error.statusCode === 429) {
      return new AppError(429, "RATE_LIMIT_EXCEEDED", "Too many requests.");
    }

    if (error.statusCode >= 500) {
      return new AppError(500, "INTERNAL_SERVER_ERROR", "Internal server error.");
    }
  }

  return null;
}
