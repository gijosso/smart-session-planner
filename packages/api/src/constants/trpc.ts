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

/**
 * Request size limits
 */
export const REQUEST_LIMITS = {
  /** Maximum request payload size in bytes (default: 1MB) */
  MAX_REQUEST_SIZE_BYTES: 1024 * 1024, // 1MB
  /** Maximum input object size (approximate, in characters when stringified) */
  MAX_INPUT_SIZE_CHARS: 100_000, // ~100KB when stringified
} as const;

/**
 * Request timeout configuration
 */
export const REQUEST_TIMEOUT = {
  /** Default timeout for queries in milliseconds (30 seconds) */
  QUERY_TIMEOUT_MS: 30 * 1000,
  /** Default timeout for mutations in milliseconds (60 seconds) */
  MUTATION_TIMEOUT_MS: 60 * 1000,
} as const;

/**
 * Timezone cache configuration
 */
export const TIMEZONE_CACHE = {
  /** Time-to-live for cached timezone lookups in milliseconds (5 minutes) */
  TTL_MS: 5 * 60 * 1000,
} as const;
