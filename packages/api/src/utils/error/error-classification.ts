import type { TRPCError } from "@trpc/server";

/**
 * User-friendly error messages for common error patterns
 * Prevents exposing internal error details
 * Messages are standardized and user-friendly
 */
const ERROR_MESSAGES = {
  CONFLICT: "This operation conflicts with existing data",
  NOT_FOUND: "The requested resource was not found",
  BAD_REQUEST: "Invalid request data provided",
  INVALID_TIMEZONE: "Invalid timezone provided",
  INVALID_DATE: "Invalid date provided",
  INVALID_DATE_RANGE: "Date range exceeds maximum allowed",
  INVALID_LOOK_AHEAD_DAYS: "Look ahead days must be between 1 and 30",
  INVALID_SESSION_ID: "Invalid session ID format",
  NO_FIELDS_TO_UPDATE: "No fields provided to update",
  END_TIME_BEFORE_START: "End time must be after start time",
  OPERATION_FAILED: "The operation could not be completed. Please try again.",
} as const;

/**
 * Check if error message matches common patterns for error classification
 * Returns sanitized, user-friendly error messages to prevent information leakage
 * Shared utility used by handleDatabaseError
 */
export function classifyErrorByMessage(message: string): {
  code: TRPCError["code"];
  message: string;
} | null {
  const lowerMessage = message.toLowerCase();

  // Check most common patterns first for performance
  // Use more specific patterns to reduce false positives

  // Conflict errors (time slot conflicts, duplicate records, etc.)
  // Check for conflict patterns first (most specific)
  if (
    lowerMessage.includes("conflicts with") ||
    lowerMessage.includes("time slot conflicts") ||
    lowerMessage.includes("conflicts with existing") ||
    lowerMessage.includes("this time slot conflicts")
  ) {
    return { code: "CONFLICT", message: ERROR_MESSAGES.CONFLICT };
  }

  // Not found errors (session not found, access denied, etc.)
  // Check for not found patterns (specific)
  if (
    lowerMessage.includes("session not found") ||
    lowerMessage.includes("not found or access denied") ||
    (lowerMessage.includes("not found") &&
      lowerMessage.includes("access denied")) ||
    lowerMessage.includes("does not exist")
  ) {
    return { code: "NOT_FOUND", message: ERROR_MESSAGES.NOT_FOUND };
  }

  // Validation errors - check specific patterns first, then generic
  // Time validation
  if (lowerMessage.includes("end time must be after start time")) {
    return {
      code: "BAD_REQUEST",
      message: ERROR_MESSAGES.END_TIME_BEFORE_START,
    };
  }

  // Timezone validation
  if (
    lowerMessage.includes("invalid timezone") ||
    (lowerMessage.includes("invalid") && lowerMessage.includes("timezone"))
  ) {
    return { code: "BAD_REQUEST", message: ERROR_MESSAGES.INVALID_TIMEZONE };
  }

  // Date range validation
  if (lowerMessage.includes("date range cannot exceed")) {
    return { code: "BAD_REQUEST", message: ERROR_MESSAGES.INVALID_DATE_RANGE };
  }

  // Session ID validation
  if (
    lowerMessage.includes("invalid session id format") ||
    lowerMessage.includes("invalid excludesessionid format")
  ) {
    return { code: "BAD_REQUEST", message: ERROR_MESSAGES.INVALID_SESSION_ID };
  }

  // No fields to update
  if (lowerMessage.includes("no fields provided to update")) {
    return { code: "BAD_REQUEST", message: ERROR_MESSAGES.NO_FIELDS_TO_UPDATE };
  }

  // Date validation
  if (
    lowerMessage.includes("invalid date provided") ||
    lowerMessage.includes("invalid startdate")
  ) {
    return { code: "BAD_REQUEST", message: ERROR_MESSAGES.INVALID_DATE };
  }

  // Look ahead days validation
  if (lowerMessage.includes("lookaheaddays must be between")) {
    return {
      code: "BAD_REQUEST",
      message: ERROR_MESSAGES.INVALID_LOOK_AHEAD_DAYS,
    };
  }

  // Operation failed errors (internal errors that should be user-friendly)
  if (
    lowerMessage.includes("unable to create session") ||
    lowerMessage.includes("unable to update session") ||
    lowerMessage.includes("unable to delete session") ||
    lowerMessage.includes("unable to update session completion") ||
    lowerMessage.includes("unable to create availability") ||
    lowerMessage.includes("unable to update availability") ||
    lowerMessage.includes("failed to create session") ||
    lowerMessage.includes("failed to update session") ||
    lowerMessage.includes("failed to delete session") ||
    lowerMessage.includes("failed to toggle session") ||
    lowerMessage.includes("failed to create availability") ||
    lowerMessage.includes("failed to update availability")
  ) {
    return {
      code: "INTERNAL_SERVER_ERROR",
      message: ERROR_MESSAGES.OPERATION_FAILED,
    };
  }

  // Generic validation patterns (check last to avoid false positives)
  // Exclude patterns already handled above
  if (
    (lowerMessage.includes("invalid") &&
      !lowerMessage.includes("timezone") &&
      !lowerMessage.includes("date")) ||
    lowerMessage.includes("validation")
  ) {
    return { code: "BAD_REQUEST", message: ERROR_MESSAGES.BAD_REQUEST };
  }

  return null;
}
