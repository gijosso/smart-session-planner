/**
 * Constants for date and time utilities
 */

/**
 * Day of week numeric values (0 = Sunday, 6 = Saturday)
 */
export const DAY_OF_WEEK_NUMBERS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

/**
 * Time range limits
 */
export const TIME_RANGES = {
  /** Minimum hour value (0-23) */
  MIN_HOUR: 0,
  /** Maximum hour value (0-23) */
  MAX_HOUR: 23,
  /** Minimum minute value (0-59) */
  MIN_MINUTE: 0,
  /** Maximum minute value (0-59) */
  MAX_MINUTE: 59,
} as const;

/**
 * Time conversion constants
 */
export const TIME_CONVERSIONS = {
  /** Milliseconds per second */
  MS_PER_SECOND: 1000,
  /** Seconds per minute */
  SECONDS_PER_MINUTE: 60,
  /** Minutes per hour */
  MINUTES_PER_HOUR: 60,
  /** Hours per day */
  HOURS_PER_DAY: 24,
  /** Milliseconds per minute */
  MS_PER_MINUTE: 1000 * 60,
  /** Milliseconds per hour */
  MS_PER_HOUR: 1000 * 60 * 60,
  /** Milliseconds per day */
  MS_PER_DAY: 1000 * 60 * 60 * 24,
} as const;

/**
 * Date formatting constants
 */
export const DATE_FORMATTING = {
  /** Padding width for hours/minutes in time strings */
  TIME_PADDING_WIDTH: 2,
  /** Padding character for time strings */
  TIME_PADDING_CHAR: "0",
  /** Seconds suffix for time strings */
  TIME_SECONDS_SUFFIX: ":00",
} as const;

/**
 * Week calculation constants
 */
export const WEEK_CALCULATIONS = {
  /** Days in a week */
  DAYS_IN_WEEK: 7,
} as const;

