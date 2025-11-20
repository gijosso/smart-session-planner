/**
 * Constants for tRPC middleware and configuration
 */

/**
 * Development timing middleware configuration
 */
export const TIMING_MIDDLEWARE = {
  /** Minimum artificial delay in milliseconds (dev only) */
  MIN_DELAY_MS: 100,
  /** Maximum artificial delay range in milliseconds (dev only) */
  DELAY_RANGE_MS: 400,
} as const;

