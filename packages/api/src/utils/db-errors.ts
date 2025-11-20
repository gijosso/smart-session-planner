import { TRPCError } from "@trpc/server";

import {
  CONSTRAINT_MESSAGES,
  DEFAULT_CONSTRAINT_MESSAGE,
  POSTGRES_ERROR_CODES,
  UNKNOWN_CONSTRAINT_NAME,
} from "../constants/db-errors";

/**
 * Log error details server-side (sanitized for security)
 * In production, this should use a proper logging service
 */
function logError(
  error: unknown,
  operation: string,
  context?: Record<string, unknown>,
): void {
  const errorDetails = {
    operation,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    ...context,
  };

  // Log full error details server-side for debugging
  // In production, integrate with proper logging service (e.g., Sentry, DataDog)
  console.error(`[ERROR] ${operation} failed:`, errorDetails);

  // If it's a Postgres error, log the code for debugging
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    console.error(`[ERROR] Database error code:`, (error as { code: string }).code);
  }
}

/**
 * Check if an error is a PostgreSQL constraint violation
 */
function isPostgresError(
  error: unknown,
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/**
 * Sanitize error message to prevent information leakage
 * Removes database-specific details that shouldn't be exposed to clients
 */
function sanitizeErrorMessage(message: string): string {
  // Remove common database-specific patterns
  return message
    .replace(/relation "([^"]+)"/gi, "table")
    .replace(/column "([^"]+)"/gi, "field")
    .replace(/constraint "([^"]+)"/gi, "constraint")
    .replace(/index "([^"]+)"/gi, "index")
    .replace(/\(SQLSTATE [0-9A-Z]+\)/gi, "")
    .trim();
}

/**
 * Handle database constraint violations and convert to user-friendly TRPC errors
 * This function sanitizes error messages to prevent information leakage
 */
export function handleDatabaseError(
  error: unknown,
  operation: string,
  context?: Record<string, unknown>,
): never {
  // Log error details server-side (full details for debugging)
  logError(error, operation, context);

  // Handle application-level errors (e.g., from checkSessionConflicts)
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("conflicts with")) {
      throw new TRPCError({
        code: "CONFLICT",
        message: error.message, // Application-level conflict messages are safe
      });
    }

    if (message.includes("not found") || message.includes("access denied")) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: error.message, // Application-level not found messages are safe
      });
    }

    // Handle validation errors
    if (message.includes("invalid") || message.includes("validation")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    }
  }

  // Handle PostgreSQL constraint violations
  if (isPostgresError(error)) {
    switch (error.code) {
      case POSTGRES_ERROR_CODES.UNIQUE_VIOLATION:
        throw new TRPCError({
          code: "CONFLICT",
          message: "A record with this information already exists",
        });

      case POSTGRES_ERROR_CODES.CHECK_VIOLATION: {
        // Extract constraint name from error message if possible
        const constraintMatch = /constraint "([^"]+)"/.exec(error.message);
        const constraintName = constraintMatch?.[1] ?? UNKNOWN_CONSTRAINT_NAME;

        const userMessage =
          CONSTRAINT_MESSAGES[constraintName] ?? DEFAULT_CONSTRAINT_MESSAGE;

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: userMessage,
        });
      }

      case POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Referenced record does not exist",
        });

      case POSTGRES_ERROR_CODES.NOT_NULL_VIOLATION:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Required field is missing",
        });

      default:
        // Unknown PostgreSQL error - sanitize message
        const sanitizedMessage = sanitizeErrorMessage(error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected database error occurred. Please try again later.",
        });
    }
  }

  // Fallback for unknown errors - never expose internal error details
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Failed to ${operation}. Please try again later.`,
  });
}

/**
 * Handle authentication-related errors
 * Converts auth errors to appropriate TRPC errors
 */
export function handleAuthError(
  error: unknown,
  operation: string,
): never {
  logError(error, operation, { type: "auth" });

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Handle common auth error patterns
    if (
      message.includes("invalid") ||
      message.includes("incorrect") ||
      message.includes("wrong")
    ) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid credentials provided",
      });
    }

    if (message.includes("email") && message.includes("already")) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An account with this email already exists",
      });
    }

    if (message.includes("token") || message.includes("expired")) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Session expired. Please sign in again.",
      });
    }

    if (message.includes("rate limit") || message.includes("too many")) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please try again later.",
      });
    }

    // Generic auth error
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication failed. Please try again.",
    });
  }

  // Fallback
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Failed to ${operation}. Please try again later.`,
  });
}

/**
 * Wrapper for async operations with consistent error handling
 * Use this in procedures to ensure all errors are handled consistently
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, unknown>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    return handleDatabaseError(error, operationName, context);
  }
}
