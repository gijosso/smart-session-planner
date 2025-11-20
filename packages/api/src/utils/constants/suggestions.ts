import type { SessionType } from "@ssp/db/schema";

/**
 * Suggestion algorithm constants
 */
export const SUGGESTION_CONSTANTS = {
  /** Minimum spacing between sessions in hours */
  MIN_SESSION_SPACING_HOURS: 2,
  /** Minimum spacing between suggestions in hours */
  MIN_SUGGESTION_SPACING_HOURS: 2,
  /** Maximum number of suggestions to return */
  MAX_SUGGESTIONS: 10,
  /** Default duration for suggested sessions in minutes */
  DEFAULT_SESSION_DURATION_MINUTES: 60,
  /** Default priority for suggested sessions */
  DEFAULT_SESSION_PRIORITY: 3,
  /** Days ahead to look for suggestions (default) */
  DEFAULT_LOOK_AHEAD_DAYS: 14,
  /** Maximum look-ahead days */
  MAX_LOOK_AHEAD_DAYS: 30,
  /** Minimum look-ahead days */
  MIN_LOOK_AHEAD_DAYS: 1,
  /** Days from now to consider "soon" for bonus scoring */
  SOON_DAYS_THRESHOLD: 3,
  /** Bonus score for near-term slots */
  SOON_BONUS_SCORE: 5,
  /** Base score for suggestions */
  BASE_SCORE: 50,
  /** Maximum score for suggestions */
  MAX_SCORE: 100,
  /** Minimum score for suggestions */
  MIN_SCORE: 0,
  /** Penalty for consecutive suggestions */
  CONSECUTIVE_SUGGESTION_PENALTY: 50,
  /** Spacing penalty multiplier */
  SPACING_PENALTY_MULTIPLIER: 20,
  /** Good spacing bonus */
  GOOD_SPACING_BONUS: 10,
  /** Frequency bonus multiplier */
  FREQUENCY_BONUS_MULTIPLIER: 5,
  /** Maximum frequency bonus */
  MAX_FREQUENCY_BONUS: 30,
  /** Minimum pattern frequency to include */
  MIN_PATTERN_FREQUENCY: 2,
  /** Round minutes to nearest interval */
  MINUTE_ROUNDING_INTERVAL: 30,
  /** Maximum number of candidate slots to generate before conflict checking */
  MAX_CANDIDATE_SLOTS: 200,
  /** Maximum number of ranges to check in batch conflict checking */
  MAX_BATCH_CONFLICT_RANGES: 100,
} as const;

/**
 * Session type display labels
 */
export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  DEEP_WORK: "Deep Work",
  WORKOUT: "Workout",
  LANGUAGE: "Language",
  MEDITATION: "Meditation",
  CLIENT_MEETING: "Client Meeting",
  STUDY: "Study",
  READING: "Reading",
  OTHER: "Other",
} as const;
