import { DATE_CONSTANTS } from "./time";

/**
 * Request validation constants
 */
export const REQUEST_CONSTANTS = {
  /** Maximum request body size in bytes (1MB) */
  MAX_REQUEST_SIZE_BYTES: 1024 * 1024,
  /** Maximum date range in days for queries (1 year) */
  MAX_DATE_RANGE_DAYS: 365,
  /** Days per year (average, accounting for leap years) */
  DAYS_PER_YEAR: 365.25,
  /** Maximum years in the past for date queries (10 years) */
  MAX_PAST_YEARS: 10,
  /** Maximum years in the future for date queries (10 years) */
  MAX_FUTURE_YEARS: 10,
  /** Maximum pagination limit per request */
  MAX_PAGINATION_LIMIT: 100,
  /** Default pagination limit */
  DEFAULT_PAGINATION_LIMIT: 50,
  /** Maximum offset for pagination (to prevent performance issues) */
  MAX_PAGINATION_OFFSET: 10000,
  /** Maximum number of sessions to load for suggestion generation */
  MAX_SESSIONS_FOR_SUGGESTIONS: 1000,
} as const;

/**
 * Availability validation constants
 */
export const AVAILABILITY_CONSTANTS = {
  /** Minimum time window duration in minutes */
  MIN_WINDOW_DURATION_MINUTES: 15,
  /** Maximum time window duration in hours */
  MAX_WINDOW_DURATION_HOURS: 24,
  /** Minimum time window duration in milliseconds */
  MIN_WINDOW_DURATION_MS:
    15 * DATE_CONSTANTS.MS_PER_SECOND * DATE_CONSTANTS.SECONDS_PER_MINUTE,
  /** Maximum time window duration in milliseconds */
  MAX_WINDOW_DURATION_MS:
    24 *
    DATE_CONSTANTS.MS_PER_SECOND *
    DATE_CONSTANTS.SECONDS_PER_MINUTE *
    DATE_CONSTANTS.MINUTES_PER_HOUR,
} as const;

/**
 * Validation constants
 */
export const VALIDATION_CONSTANTS = {
  /** UUID v4 regex pattern */
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;
