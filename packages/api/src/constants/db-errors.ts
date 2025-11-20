/**
 * Constants for database error handling
 */

/**
 * PostgreSQL error codes
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const POSTGRES_ERROR_CODES = {
  /** Unique constraint violation */
  UNIQUE_VIOLATION: "23505",
  /** Check constraint violation */
  CHECK_VIOLATION: "23514",
  /** Foreign key constraint violation */
  FOREIGN_KEY_VIOLATION: "23503",
  /** Not null constraint violation */
  NOT_NULL_VIOLATION: "23502",
} as const;

/**
 * Constraint name mappings for user-friendly error messages
 */
export const CONSTRAINT_MESSAGES: Record<string, string> = {
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
} as const;

/**
 * Default constraint message for unknown constraints
 */
export const DEFAULT_CONSTRAINT_MESSAGE = "Invalid data provided";

/**
 * Default unknown constraint name
 */
export const UNKNOWN_CONSTRAINT_NAME = "unknown";

