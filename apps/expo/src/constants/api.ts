/**
 * API-related constants
 */

// Token refresh configuration
export const REFRESH_TIMEOUT_MS = 10000; // 10 seconds timeout
export const MAX_REFRESH_RETRIES = 2;
export const STALE_REFRESH_THRESHOLD_MS = 5000; // 5 seconds - consider refresh stale after this

// Token refresh queue configuration
export const MAX_REFRESH_QUEUE_SIZE = 100; // Maximum number of queued requests
export const QUEUED_REQUEST_TIMEOUT_MS = 30000; // 30 seconds - timeout for queued requests
export const QUEUE_CLEANUP_INTERVAL_MS = 60000; // 1 minute - how often to clean up stale requests

// Token refresh intervals
export const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Retry configuration
export const DEFAULT_RETRY_DELAY_MS = 1000; // 1 second
export const MAX_RETRY_DELAY_MS = 30000; // 30 seconds
export const MAX_QUERY_RETRIES = 3; // Maximum retries for queries
export const MAX_MUTATION_RETRIES = 1; // Retries for mutations

// Query stale time configuration (in milliseconds)
export const TODAY_SESSIONS_STALE_TIME_MS = 30 * 1000; // 30 seconds - today's sessions are critical
export const STATS_STALE_TIME_MS = 60 * 1000; // 1 minute - stats can be slightly stale
export const SUGGESTIONS_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes - suggestions can be stale
