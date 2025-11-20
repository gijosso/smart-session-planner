/**
 * Time conversion constants
 * Used for date/time calculations throughout the API
 */

/**
 * Base time constants (internal, used for calculations)
 */
const TIME_BASE = {
  /** Milliseconds per second */
  MS_PER_SECOND: 1000,
  /** Seconds per minute */
  SECONDS_PER_MINUTE: 60,
  /** Minutes per hour */
  MINUTES_PER_HOUR: 60,
  /** Hours per day */
  HOURS_PER_DAY: 24,
} as const;

/**
 * Exported time constants for use in calculations
 */
export const TIME_CONSTANTS = {
  /** Milliseconds per second */
  MS_PER_SECOND: TIME_BASE.MS_PER_SECOND,
  /** Seconds per minute */
  SECONDS_PER_MINUTE: TIME_BASE.SECONDS_PER_MINUTE,
  /** Minutes per hour */
  MINUTES_PER_HOUR: TIME_BASE.MINUTES_PER_HOUR,
  /** Hours per day */
  HOURS_PER_DAY: TIME_BASE.HOURS_PER_DAY,
  /** Milliseconds per hour */
  MS_PER_HOUR:
    TIME_BASE.MS_PER_SECOND *
    TIME_BASE.SECONDS_PER_MINUTE *
    TIME_BASE.MINUTES_PER_HOUR,
} as const;

/**
 * Date/time calculation constants
 */
export const DATE_CONSTANTS = {
  /** Milliseconds per second */
  MS_PER_SECOND: TIME_BASE.MS_PER_SECOND,
  /** Seconds per minute */
  SECONDS_PER_MINUTE: TIME_BASE.SECONDS_PER_MINUTE,
  /** Minutes per hour */
  MINUTES_PER_HOUR: TIME_BASE.MINUTES_PER_HOUR,
  /** Hours per day */
  HOURS_PER_DAY: TIME_BASE.HOURS_PER_DAY,
  /** Days per week */
  DAYS_PER_WEEK: 7,
  /** Milliseconds per minute */
  MS_PER_MINUTE: TIME_BASE.MS_PER_SECOND * TIME_BASE.SECONDS_PER_MINUTE,
  /** Milliseconds per hour */
  MS_PER_HOUR:
    TIME_BASE.MS_PER_SECOND *
    TIME_BASE.SECONDS_PER_MINUTE *
    TIME_BASE.MINUTES_PER_HOUR,
  /** Milliseconds per day */
  MS_PER_DAY:
    TIME_BASE.MS_PER_SECOND *
    TIME_BASE.SECONDS_PER_MINUTE *
    TIME_BASE.MINUTES_PER_HOUR *
    TIME_BASE.HOURS_PER_DAY,
  /** Milliseconds per year (average, accounting for leap years) */
  MS_PER_YEAR:
    TIME_BASE.MS_PER_SECOND *
    TIME_BASE.SECONDS_PER_MINUTE *
    TIME_BASE.MINUTES_PER_HOUR *
    TIME_BASE.HOURS_PER_DAY *
    365.25,
} as const;
