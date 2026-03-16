import { Prisma } from "@prisma/client";

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
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

  return null;
}
