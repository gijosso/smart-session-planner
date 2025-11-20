import { TRPCError } from "@trpc/server";

import type { AppError } from "./codes";
import {
  CONSTRAINT_MESSAGES,
  DEFAULT_CONSTRAINT_MESSAGE,
  POSTGRES_ERROR_CODES,
  UNKNOWN_CONSTRAINT_NAME,
} from "../../constants/db-errors";
import { logger } from "../logger";
import {
  AuthenticationError,
  ConflictError,
  DatabaseError,
  detectAuthErrorFromMessage,
  detectErrorFromMessage,
  isAppError,
  isDevelopment,
  isPostgresError,
  RateLimitError,
  sanitizeError,
  sanitizeErrorMessage,
  ValidationError,
} from "./codes";

/**
 * Log error details server-side (sanitized for security)
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
  logger.error(`${operation} failed`, errorDetails);

  // If it's a Postgres error, log the code for debugging
  if (isPostgresError(error)) {
    logger.error("Database error code", {
      code: error.code,
      operation,
    });
  }
}

/**
 * Convert AppError to TRPCError
 * Centralizes the conversion logic for consistency
 * In production, obfuscates error messages and removes stack traces
 */
function appErrorToTRPCError(error: AppError): TRPCError {
  const isDev = isDevelopment();
  const sanitizedMessage = sanitizeErrorMessage(error.message, error.code);

  // In production, don't include the cause to avoid exposing nested errors and stack traces
  // In development, include full error details for debugging
  return new TRPCError({
    code: error.code as
      | "CONFLICT"
      | "NOT_FOUND"
      | "BAD_REQUEST"
      | "UNAUTHORIZED"
      | "TOO_MANY_REQUESTS"
      | "INTERNAL_SERVER_ERROR",
    message: sanitizedMessage,
    cause: isDev ? error : sanitizeError(error),
  });
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

  // Handle typed application errors first
  if (isAppError(error)) {
    throw appErrorToTRPCError(error);
  }

  // Handle legacy string-based error detection (for backward compatibility)
  // This can be removed once all helpers use typed errors
  if (error instanceof Error) {
    const detected = detectErrorFromMessage(error.message);
    if (detected) {
      const sanitizedMessage = sanitizeErrorMessage(
        detected.message,
        detected.code,
      );
      throw new TRPCError({
        code: detected.code,
        message: sanitizedMessage,
        cause: isDevelopment() ? error : sanitizeError(error),
      });
    }
  }

  // Handle PostgreSQL constraint violations
  if (isPostgresError(error)) {
    switch (error.code) {
      case POSTGRES_ERROR_CODES.UNIQUE_VIOLATION: {
        const isDev = isDevelopment();
        const message = sanitizeErrorMessage(
          "A record with this information already exists",
          "CONFLICT",
        );
        throw new TRPCError({
          code: "CONFLICT",
          message,
          cause: isDev
            ? new ConflictError(
                "A record with this information already exists",
                {
                  dbCode: error.code,
                  ...context,
                },
              )
            : sanitizeError(
                new ConflictError(
                  "A record with this information already exists",
                  {
                    dbCode: error.code,
                    ...context,
                  },
                ),
              ),
        });
      }

      case POSTGRES_ERROR_CODES.CHECK_VIOLATION: {
        // Extract constraint name from error message if possible
        const constraintMatch = /constraint "([^"]+)"/.exec(error.message);
        const constraintName = constraintMatch?.[1] ?? UNKNOWN_CONSTRAINT_NAME;

        const userMessage =
          CONSTRAINT_MESSAGES[constraintName] ?? DEFAULT_CONSTRAINT_MESSAGE;
        const isDev = isDevelopment();
        const sanitizedMessage = sanitizeErrorMessage(
          userMessage,
          "BAD_REQUEST",
        );

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: sanitizedMessage,
          cause: isDev
            ? new ValidationError(userMessage, {
                dbCode: error.code,
                constraintName,
                ...context,
              })
            : sanitizeError(
                new ValidationError(userMessage, {
                  dbCode: error.code,
                  constraintName,
                  ...context,
                }),
              ),
        });
      }

      case POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION: {
        const isDev = isDevelopment();
        const message = sanitizeErrorMessage(
          "Referenced record does not exist",
          "BAD_REQUEST",
        );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
          cause: isDev
            ? new ValidationError("Referenced record does not exist", {
                dbCode: error.code,
                ...context,
              })
            : sanitizeError(
                new ValidationError("Referenced record does not exist", {
                  dbCode: error.code,
                  ...context,
                }),
              ),
        });
      }

      case POSTGRES_ERROR_CODES.NOT_NULL_VIOLATION: {
        const isDev = isDevelopment();
        const message = sanitizeErrorMessage(
          "Required field is missing",
          "BAD_REQUEST",
        );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
          cause: isDev
            ? new ValidationError("Required field is missing", {
                dbCode: error.code,
                ...context,
              })
            : sanitizeError(
                new ValidationError("Required field is missing", {
                  dbCode: error.code,
                  ...context,
                }),
              ),
        });
      }

      default: {
        // Unknown PostgreSQL error - sanitize message
        const isDev = isDevelopment();
        const message = sanitizeErrorMessage(
          "An unexpected database error occurred. Please try again later.",
          "INTERNAL_SERVER_ERROR",
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
          cause: isDev
            ? new DatabaseError(
                "An unexpected database error occurred",
                error.code,
                context,
              )
            : sanitizeError(
                new DatabaseError(
                  "An unexpected database error occurred",
                  error.code,
                  context,
                ),
              ),
        });
      }
    }
  }

  // Fallback for unknown errors - never expose internal error details
  const isDev = isDevelopment();
  const message = sanitizeErrorMessage(
    `Failed to ${operation}. Please try again later.`,
    "INTERNAL_SERVER_ERROR",
  );
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message,
    cause: isDev
      ? new DatabaseError(`Failed to ${operation}`, undefined, {
          operation,
          ...context,
        })
      : sanitizeError(
          new DatabaseError(`Failed to ${operation}`, undefined, {
            operation,
            ...context,
          }),
        ),
  });
}

/**
 * Handle authentication-related errors
 * Converts auth errors to appropriate TRPC errors
 */
export function handleAuthError(error: unknown, operation: string): never {
  logError(error, operation, { type: "auth" });

  // Handle typed application errors first
  if (isAppError(error)) {
    throw appErrorToTRPCError(error);
  }

  // Handle legacy string-based error detection (for backward compatibility)
  if (error instanceof Error) {
    const detected = detectAuthErrorFromMessage(error.message);
    if (detected) {
      // Create appropriate typed error for the detected type
      let cause: AppError;
      const detectedCode = detected.code;
      switch (detectedCode) {
        case "CONFLICT":
          cause = new ConflictError(detected.message, { operation });
          break;
        case "TOO_MANY_REQUESTS":
          cause = new RateLimitError(detected.message, undefined, {
            operation,
          });
          break;
        case "UNAUTHORIZED":
        default:
          cause = new AuthenticationError(detected.message, { operation });
          break;
      }

      const sanitizedMessage = sanitizeErrorMessage(
        detected.message,
        detected.code,
      );
      throw new TRPCError({
        code: detected.code,
        message: sanitizedMessage,
        cause: isDevelopment() ? cause : sanitizeError(cause),
      });
    }

    // Generic auth error fallback
    const isDev = isDevelopment();
    const message = sanitizeErrorMessage(
      "Authentication failed. Please try again.",
      "UNAUTHORIZED",
    );
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message,
      cause: isDev
        ? new AuthenticationError("Authentication failed. Please try again.", {
            operation,
          })
        : sanitizeError(
            new AuthenticationError(
              "Authentication failed. Please try again.",
              {
                operation,
              },
            ),
          ),
    });
  }

  // Fallback
  const isDev = isDevelopment();
  const message = sanitizeErrorMessage(
    `Failed to ${operation}. Please try again later.`,
    "INTERNAL_SERVER_ERROR",
  );
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message,
    cause: isDev
      ? new DatabaseError(`Failed to ${operation}`, undefined, {
          operation,
          type: "auth",
        })
      : sanitizeError(
          new DatabaseError(`Failed to ${operation}`, undefined, {
            operation,
            type: "auth",
          }),
        ),
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
