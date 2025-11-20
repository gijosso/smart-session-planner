/**
 * Typed error classes for standardized error handling
 * These errors can be thrown from helpers and will be properly converted to TRPC errors
 */

/**
 * Valid TRPC error codes
 */
export type TRPCErrorCode =
  | "CONFLICT"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_SERVER_ERROR";

/**
 * Base class for all application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: TRPCErrorCode,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Conflict error - used when a resource conflicts with existing data
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "CONFLICT" satisfies TRPCErrorCode, context);
  }
}

/**
 * Not found error - used when a resource is not found or access is denied
 */
export class NotFoundError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NOT_FOUND" satisfies TRPCErrorCode, context);
  }
}

/**
 * Validation error - used for invalid input data
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "BAD_REQUEST" satisfies TRPCErrorCode, context);
  }
}

/**
 * Authentication error - used for auth-related failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "UNAUTHORIZED" satisfies TRPCErrorCode, context);
  }
}

/**
 * Rate limit error - used when rate limits are exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message: string,
    public readonly resetAt?: number,
    context?: Record<string, unknown>,
  ) {
    super(message, "TOO_MANY_REQUESTS" satisfies TRPCErrorCode, context);
  }
}

/**
 * Database error - used for database-specific errors
 * This is a base class for more specific database errors
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    public readonly dbCode?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "INTERNAL_SERVER_ERROR" satisfies TRPCErrorCode, context);
  }
}

/**
 * Check if an error is an instance of AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if an error is a PostgreSQL error
 */
export function isPostgresError(
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
 * Check if we're running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Sanitize error message for production
 * Removes sensitive information and provides generic messages
 */
export function sanitizeErrorMessage(
  message: string,
  code: TRPCErrorCode,
): string {
  // In development, return the original message
  if (isDevelopment()) {
    return message;
  }

  // In production, return generic messages based on error code
  switch (code) {
    case "CONFLICT":
      return "A conflict occurred. Please try again.";
    case "NOT_FOUND":
      return "The requested resource was not found.";
    case "BAD_REQUEST":
      return "Invalid request. Please check your input and try again.";
    case "UNAUTHORIZED":
      return "Authentication failed. Please try again.";
    case "TOO_MANY_REQUESTS":
      return "Too many requests. Please try again later.";
    case "INTERNAL_SERVER_ERROR":
    default:
      return "An unexpected error occurred. Please try again later.";
  }
}

/**
 * Sanitize error object for production
 * Removes stack traces and sensitive information from nested errors
 */
export function sanitizeError(error: unknown): unknown {
  if (isDevelopment()) {
    return error;
  }

  if (error instanceof Error) {
    // Create a sanitized error without stack trace
    const sanitized = new Error(
      sanitizeErrorMessage(error.message, "INTERNAL_SERVER_ERROR"),
    );
    sanitized.name = error.name;
    // Explicitly remove stack trace
    delete (sanitized as { stack?: string }).stack;
    return sanitized;
  }

  return error;
}

/**
 * Detect error type from legacy string-based error messages
 * Used for backward compatibility with helpers that haven't migrated to typed errors
 */
export function detectErrorFromMessage(
  message: string,
): { code: TRPCErrorCode; message: string } | null {
  const lowerMessage = message.toLowerCase();

  // Conflict detection
  if (lowerMessage.includes("conflicts with")) {
    return { code: "CONFLICT", message };
  }

  // Not found detection
  if (
    lowerMessage.includes("not found") ||
    lowerMessage.includes("access denied")
  ) {
    return { code: "NOT_FOUND", message };
  }

  // Validation detection
  if (lowerMessage.includes("invalid") || lowerMessage.includes("validation")) {
    return { code: "BAD_REQUEST", message };
  }

  return null;
}

/**
 * Detect auth error type from legacy string-based error messages
 * Used for backward compatibility with auth helpers that haven't migrated to typed errors
 */
export function detectAuthErrorFromMessage(
  message: string,
): { code: TRPCErrorCode; message: string } | null {
  const lowerMessage = message.toLowerCase();

  // Invalid credentials
  if (
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("incorrect") ||
    lowerMessage.includes("wrong")
  ) {
    return { code: "UNAUTHORIZED", message: "Invalid credentials provided" };
  }

  // Email already exists
  if (lowerMessage.includes("email") && lowerMessage.includes("already")) {
    return {
      code: "CONFLICT",
      message: "An account with this email already exists",
    };
  }

  // Token expired
  if (lowerMessage.includes("token") || lowerMessage.includes("expired")) {
    return {
      code: "UNAUTHORIZED",
      message: "Session expired. Please sign in again.",
    };
  }

  // Rate limit
  if (
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("too many")
  ) {
    return {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    };
  }

  return null;
}
