/**
 * Time-related constants
 * Centralized time values to avoid magic numbers throughout the codebase
 */

// Time conversions (in milliseconds)
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// Time conversions (in seconds)
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

// Token expiration thresholds
/**
 * Token expiration buffer in seconds
 * Tokens are considered expired if they expire within this time window
 * This prevents using tokens that are about to expire
 */
export const TOKEN_EXPIRATION_BUFFER_SECONDS = 5 * SECONDS_PER_MINUTE; // 5 minutes

// Query cache times
/**
 * Default query cache time in milliseconds
 * How long unused data stays in cache before garbage collection
 */
export const DEFAULT_QUERY_CACHE_TIME_MS = 5 * MS_PER_MINUTE; // 5 minutes

// Toast durations
/**
 * Default toast notification duration in milliseconds
 */
export const DEFAULT_TOAST_DURATION_MS = 3 * MS_PER_SECOND; // 3 seconds

// Test/development delays
/**
 * Short delay for sequential UI updates (e.g., test toasts)
 */
export const SHORT_DELAY_MS = 1 * MS_PER_SECOND; // 1 second

/**
 * Medium delay for sequential UI updates (e.g., test toasts)
 */
export const MEDIUM_DELAY_MS = 2 * MS_PER_SECOND; // 2 seconds

