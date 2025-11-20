/**
 * Validation constants used by validators
 * These constants define limits and constraints for validation schemas
 */

/**
 * Session field limits
 */
export const SESSION_LIMITS = {
  /** Maximum length for session title */
  MAX_TITLE_LENGTH: 256,
  /** Minimum priority value */
  MIN_PRIORITY: 1,
  /** Maximum priority value */
  MAX_PRIORITY: 5,
} as const;

/**
 * Suggestion input limits
 */
export const SUGGESTION_INPUT_LIMITS = {
  /** Minimum look-ahead days */
  MIN_LOOKAHEAD_DAYS: 1,
  /** Maximum look-ahead days */
  MAX_LOOKAHEAD_DAYS: 30,
  /** Default look-ahead days */
  DEFAULT_LOOKAHEAD_DAYS: 14,
  /** Minimum priority value */
  MIN_PRIORITY: 1,
  /** Maximum priority value */
  MAX_PRIORITY: 5,
} as const;

/**
 * Timezone field limits
 */
export const TIMEZONE = {
  /** Maximum length for timezone string (IANA timezone) */
  MAX_LENGTH: 50,
} as const;

