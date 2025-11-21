/**
 * API-related constants
 */

// Token refresh configuration
export const REFRESH_TIMEOUT_MS = 10000; // 10 seconds timeout
export const MAX_REFRESH_RETRIES = 2;
export const STALE_REFRESH_THRESHOLD_MS = 5000; // 5 seconds - consider refresh stale after this

// Token refresh intervals
export const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Retry configuration
export const DEFAULT_RETRY_DELAY_MS = 1000; // 1 second
export const MAX_RETRY_DELAY_MS = 30000; // 30 seconds

