import { TIME_CONSTANTS } from "./time";

/**
 * Rate limiting constants
 */
export const RATE_LIMIT_CONSTANTS = {
  /** Maximum sign-up attempts per IP per window */
  MAX_SIGNUP_ATTEMPTS: 5,
  /** Maximum sign-in attempts per IP per window */
  MAX_SIGNIN_ATTEMPTS: 10,
  /** Maximum mutations per IP per window */
  MAX_MUTATION_ATTEMPTS: 30,
  /** Stricter rate limit for unknown clients (without IP headers) */
  MAX_UNKNOWN_CLIENT_ATTEMPTS: 3,
  /** Rate limit window in milliseconds (15 minutes) */
  RATE_LIMIT_WINDOW_MS:
    TIME_CONSTANTS.MS_PER_SECOND * TIME_CONSTANTS.SECONDS_PER_MINUTE * 15,
  /** Maximum entries to clean up per cleanup call */
  MAX_CLEANUP_PER_CALL: 1000,
  /** Cleanup interval in milliseconds (5 minutes) */
  CLEANUP_INTERVAL_MS:
    TIME_CONSTANTS.MS_PER_SECOND * TIME_CONSTANTS.SECONDS_PER_MINUTE * 5,
  /** Maximum size of rate limit store before forcing cleanup */
  MAX_STORE_SIZE: 10000,
} as const;
