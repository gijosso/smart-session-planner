/**
 * Rate limiting constants
 *
 * Note: These limits are set very high for local development.
 * For production, use Redis for distributed rate limiting.
 */

/**
 * Rate limit configuration for mutations
 */
export const RATE_LIMIT = {
  /** Maximum number of mutations per window (very high for dev) */
  MAX_MUTATIONS_PER_WINDOW: 10_000,
  /** Time window in milliseconds (15 minutes) */
  WINDOW_MS: 15 * 60 * 1000,
  /** Maximum number of mutations per minute (burst protection, very high for dev) */
  MAX_MUTATIONS_PER_MINUTE: 1_000,
  /** Time window for burst protection in milliseconds (1 minute) */
  BURST_WINDOW_MS: 60 * 1000,
} as const;
