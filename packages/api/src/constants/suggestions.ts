/**
 * Constants for session suggestion and pattern detection algorithms
 */

/**
 * Pattern detection configuration
 */
export const PATTERN_DETECTION = {
  /** Minimum number of occurrences to consider a pattern valid */
  MIN_PATTERN_FREQUENCY: 3,
  /** Fuzzy time clustering window in minutes (±15 minutes) */
  FUZZY_TIME_WINDOW_MINUTES: 15,
  /** Round to nearest 30 minutes for pattern matching (allows flexibility) */
  PATTERN_TIME_ROUNDING_MINUTES: 30,
  /** Threshold for considering success rates different (for sorting) */
  SUCCESS_RATE_DIFFERENCE_THRESHOLD: 0.1,
  /** High success rate threshold for bonus scoring */
  HIGH_SUCCESS_RATE_THRESHOLD: 0.8,
  /** Recency decay half-life in days (patterns older than this get 50% weight) */
  RECENCY_HALF_LIFE_DAYS: 30,
} as const;

/**
 * Session spacing configuration
 */
export const SESSION_SPACING = {
  /** Minimum hours between sessions */
  MIN_SPACING_HOURS: 2,
  /** Ideal spacing between sessions */
  IDEAL_SPACING_HOURS: 4,
  /** Hours added to ideal spacing for bonus range */
  IDEAL_SPACING_BONUS_RANGE_HOURS: 2,
  /** Minimum hours between suggestions to avoid clustering */
  MIN_SUGGESTION_SPACING_HOURS: 1,
} as const;

/**
 * Session limits per day
 */
export const DAILY_SESSION_LIMITS = {
  /** Maximum high-priority (4-5) sessions per day */
  MAX_HIGH_PRIORITY_PER_DAY: 2,
  /** Maximum total sessions per day */
  MAX_TOTAL_SESSIONS_PER_DAY: 4,
  /** Priority threshold for "high priority" (>= this value) */
  HIGH_PRIORITY_THRESHOLD: 4,
} as const;

/**
 * Fatigue scoring configuration
 */
export const FATIGUE_SCORING = {
  /** Score penalty per high-priority session exceeding daily limit */
  PENALTY_PER_HIGH_PRIORITY: 15,
  /** Fatigue score threshold to skip a day */
  SKIP_DAY_THRESHOLD: 50,
  /** Penalty for too many total sessions per day */
  TOO_MANY_SESSIONS_PENALTY: 30,
} as const;

/**
 * Default session values
 */
export const DEFAULT_SESSION = {
  /** Default duration in minutes */
  DURATION_MINUTES: 60,
  /** Default priority (1-5) */
  PRIORITY: 3,
} as const;

/**
 * Suggestion generation limits
 */
export const SUGGESTION_LIMITS = {
  /** Maximum number of suggestions to return */
  MAX_SUGGESTIONS: 15,
  /** Default look-ahead days */
  DEFAULT_LOOKAHEAD_DAYS: 14,
  /** Maximum look-ahead days */
  MAX_LOOKAHEAD_DAYS: 30,
  /** Minimum look-ahead days */
  MIN_LOOKAHEAD_DAYS: 1,
  /** Days offset for distributing default suggestions */
  DEFAULT_SUGGESTION_DAY_OFFSET: 3,
  /** Days in a week */
  DAYS_IN_WEEK: 7,
  /** Days from now for near-term bonus */
  NEAR_TERM_BONUS_DAYS: 3,
  /** Maximum suggestions per day for diversity */
  MAX_SUGGESTIONS_PER_DAY: 2,
  /** Maximum suggestions per type for diversity */
  MAX_SUGGESTIONS_PER_TYPE: 3,
  /** Minimum pattern duration in minutes */
  MIN_PATTERN_DURATION_MINUTES: 15,
  /** Maximum pattern duration in minutes */
  MAX_PATTERN_DURATION_MINUTES: 480, // 8 hours
} as const;

/**
 * Scoring configuration
 * All scores normalized to 0-100 scale before combining
 */
export const SCORING = {
  /** Minimum score value */
  MIN_SCORE: 0,
  /** Maximum score value */
  MAX_SCORE: 100,
  /** Base score for pattern-based suggestions */
  BASE_PATTERN_SCORE: 40,
  /** Base score for default suggestions */
  BASE_DEFAULT_SCORE: 50,
  /** Overlap penalty (normalized to 0-100 scale) */
  OVERLAP_PENALTY: 100,
  /** Penalty multiplier for spacing violations (normalized) */
  SPACING_PENALTY_MULTIPLIER: 25,
  /** Bonus for ideal spacing (normalized) */
  IDEAL_SPACING_BONUS: 5,
  /** Penalty for high-priority sessions too close (normalized) */
  HIGH_PRIORITY_CLOSE_PENALTY: 15,
  /** Heavy penalty for consecutive suggestions (normalized) */
  CONSECUTIVE_SUGGESTION_PENALTY: 40,
  /** Frequency bonus multiplier (normalized to 0-100) */
  FREQUENCY_BONUS_MULTIPLIER: 4,
  /** Maximum frequency bonus (normalized) */
  MAX_FREQUENCY_BONUS: 25,
  /** Success rate bonus multiplier (normalized to 0-100) */
  SUCCESS_RATE_BONUS_MULTIPLIER: 15,
  /** Spacing score weight (as percentage) - applied after normalization */
  SPACING_SCORE_WEIGHT: 0.3,
  /** Pattern score weight (as percentage) */
  PATTERN_SCORE_WEIGHT: 0.4,
  /** Fatigue penalty weight (as percentage) */
  FATIGUE_PENALTY_WEIGHT: 0.2,
  /** Recency weight (as percentage) */
  RECENCY_WEIGHT: 0.1,
  /** Priority bonus for high-priority patterns (normalized) */
  HIGH_PRIORITY_BONUS: 3,
  /** Near-term availability bonus (normalized) */
  NEAR_TERM_BONUS: 5,
} as const;

/**
 * Day ordering for sorting (used as fallback for undefined days) */
export const DAY_ORDER = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
  /** Fallback value for undefined days */
  UNDEFINED_FALLBACK: 99,
} as const;
