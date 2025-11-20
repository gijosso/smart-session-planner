import { TRPCError } from "@trpc/server";

import { logger } from "../logger";
import { getRequestIdFromContext } from "../tracking/request-context";
import { classifyErrorByMessage } from "./error-classification";

/**
 * PostgreSQL error codes
 * See https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const POSTGRES_ERROR_CODES = {
  UNIQUE_VIOLATION: "23505",
  CHECK_VIOLATION: "23514",
  FOREIGN_KEY_VIOLATION: "23503",
  NOT_NULL_VIOLATION: "23502",
} as const;

/**
 * Check if an error is a PostgreSQL constraint violation
 * Validates that the error has the expected structure with code and message properties
 */
export function isPostgresError(
  error: unknown,
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    typeof (error as { message: unknown }).message === "string"
  );
}

/**
 * Handle errors and convert to user-friendly TRPC errors
 * This function never returns - it always throws a TRPCError
 * Includes logging with operation context and request ID
 * Handles both database errors and general application errors
 *
 * @throws {TRPCError} Always throws a TRPCError, never returns
 */
export function handleDatabaseError(
  error: unknown,
  operation: string,
  context?: Record<string, unknown> & { requestId?: string },
  defaultMessage?: string,
): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  // Get requestId from context or AsyncLocalStorage
  // Use fallback to "unknown" if not available (defensive check)
  const requestId =
    context?.requestId ?? getRequestIdFromContext() ?? "unknown";

  // Handle application-level errors (e.g., from checkSessionConflicts)
  if (error instanceof Error) {
    const classified = classifyErrorByMessage(error.message);
    if (classified) {
      logger.error(`Failed to ${operation}`, {
        error: error.message,
        code: classified.code,
        stack: error.stack,
        requestId,
        ...context,
      });
      throw new TRPCError({
        code: classified.code,
        message: classified.message,
      });
    }
  }

  // Handle PostgreSQL constraint violations
  if (isPostgresError(error)) {
    switch (error.code) {
      case POSTGRES_ERROR_CODES.UNIQUE_VIOLATION:
        logger.error(`Failed to ${operation}`, {
          errorCode: error.code,
          errorType: "unique_violation",
          requestId,
          ...context,
        });
        throw new TRPCError({
          code: "CONFLICT",
          message: "A record with this information already exists",
        });

      case POSTGRES_ERROR_CODES.CHECK_VIOLATION: {
        // Extract constraint name from error message if possible
        const constraintMatch = /constraint "([^"]+)"/.exec(error.message);
        const constraintName = constraintMatch?.[1] ?? "unknown";

        // Provide user-friendly messages for known constraints
        const constraintMessages: Record<string, string> = {
          session_end_after_start: "End time must be after start time",
          session_priority_range: "Priority must be between 1 and 5",
          session_completed_at_consistency:
            "Completion status is inconsistent. Please try again.",
          session_completed_at_after_start:
            "Completion time cannot be before session start time",
          session_completed_at_not_future:
            "Completion time cannot be in the future",
          session_completed_at_after_created:
            "Completion time cannot be before session creation time",
          profile_timezone_format: "Invalid timezone format",
        };

        const message =
          constraintMessages[constraintName] ?? "Invalid data provided";

        logger.error(`Failed to ${operation}`, {
          errorCode: error.code,
          errorType: "check_violation",
          constraintName,
          requestId,
          ...context,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }

      case POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION:
        logger.error(`Failed to ${operation}`, {
          errorCode: error.code,
          errorType: "foreign_key_violation",
          requestId,
          ...context,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Referenced record does not exist",
        });

      case POSTGRES_ERROR_CODES.NOT_NULL_VIOLATION:
        logger.error(`Failed to ${operation}`, {
          errorCode: error.code,
          errorType: "not_null_violation",
          requestId,
          ...context,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Required field is missing",
        });

      default:
        // Unknown PostgreSQL error - don't expose internal error details
        logger.error(`Failed to ${operation}`, {
          errorCode: error.code,
          errorType: "unknown_postgres_error",
          requestId,
          ...context,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "A database error occurred. Please try again later.",
        });
    }
  }

  // Fallback for unknown errors - sanitize error messages
  logger.error(`Failed to ${operation}`, {
    error: error instanceof Error ? error.message : String(error),
    errorType: "unknown_error",
    stack: error instanceof Error ? error.stack : undefined,
    requestId,
    ...context,
  });

  // Only expose user-friendly error messages, never raw error messages
  // Even if classifyErrorByMessage matches, we sanitize to prevent information leakage
  const sanitizedMessage =
    defaultMessage ?? `Failed to ${operation}. Please try again.`;

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: sanitizedMessage,
  });
}

/**
 * Execute a function with standardized error handling
 * Wraps async operations to ensure consistent error handling
 */
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  operation: string,
  context?: Record<string, unknown> & { requestId?: string },
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    handleDatabaseError(error, operation, context);
  }
};
