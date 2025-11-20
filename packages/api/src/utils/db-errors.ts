import { TRPCError } from "@trpc/server";

/**
 * PostgreSQL error codes
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const POSTGRES_ERROR_CODES = {
  UNIQUE_VIOLATION: "23505",
  CHECK_VIOLATION: "23514",
  FOREIGN_KEY_VIOLATION: "23503",
  NOT_NULL_VIOLATION: "23502",
} as const;

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
 * Handle database constraint violations and convert to user-friendly TRPC errors
 */
export function handleDatabaseError(error: unknown, operation: string): never {
  // Handle application-level errors (e.g., from checkSessionConflicts)
  if (error instanceof Error) {
    if (error.message.includes("conflicts with")) {
      throw new TRPCError({
        code: "CONFLICT",
        message: error.message,
      });
    }
    if (
      error.message.includes("not found") ||
      error.message.includes("access denied")
    ) {
      throw new TRPCError({
        code: "NOT_FOUND",
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
          constraintMessages[constraintName] ??
          `Invalid data: ${error.message}`;

        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
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
        // Unknown PostgreSQL error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database error: ${error.message}`,
        });
    }
  }

  // Fallback for unknown errors
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: error instanceof Error ? error.message : `Failed to ${operation}`,
  });
}
