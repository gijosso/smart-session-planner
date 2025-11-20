/**
 * Rate limiting constants
 */

/**
 * Rate limit configuration for mutations
 */
export const RATE_LIMIT = {
  /** Maximum number of mutations per window */
  MAX_MUTATIONS_PER_WINDOW: 100,
  /** Time window in milliseconds (15 minutes) */
  WINDOW_MS: 15 * 60 * 1000,
  /** Maximum number of mutations per minute (burst protection) */
  MAX_MUTATIONS_PER_MINUTE: 20,
  /** Time window for burst protection in milliseconds (1 minute) */
  BURST_WINDOW_MS: 60 * 1000,
} as const;
