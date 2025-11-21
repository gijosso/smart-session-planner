/**
 * Token refresh queue to handle concurrent 401 requests
 * Prevents race conditions when multiple requests fail simultaneously
 * Includes memory leak protection: timeout, max queue size, and cleanup
 */

import {
  MAX_REFRESH_QUEUE_SIZE,
  QUEUE_CLEANUP_INTERVAL_MS,
  QUEUED_REQUEST_TIMEOUT_MS,
} from "~/constants/api";

interface QueuedRequest {
  resolve: (value: void) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * Queue for requests waiting for token refresh
 * All requests that get 401 will wait here until refresh completes
 */
const refreshQueue: QueuedRequest[] = [];

/**
 * Whether a token refresh is currently in progress
 */
let isRefreshing = false;

/**
 * The promise for the current refresh operation
 */
let refreshPromise: Promise<void> | null = null;

/**
 * Interval ID for cleanup task
 */
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Clean up stale requests from the queue
 * Removes requests that have been waiting too long
 */
function cleanupStaleRequests(): void {
  const now = Date.now();
  const staleRequests: QueuedRequest[] = [];

  // Find stale requests
  for (let i = refreshQueue.length - 1; i >= 0; i--) {
    const request = refreshQueue[i];
    if (!request) continue;

    const age = now - request.timestamp;

    if (age > QUEUED_REQUEST_TIMEOUT_MS) {
      staleRequests.push(request);
      refreshQueue.splice(i, 1);
    }
  }

  // Reject stale requests
  staleRequests.forEach((request) => {
    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }
    request.reject(
      new Error(
        `Token refresh request timed out after ${QUEUED_REQUEST_TIMEOUT_MS}ms`,
      ),
    );
  });
}

/**
 * Start cleanup interval if not already running
 */
function startCleanupInterval(): void {
  cleanupIntervalId ??= setInterval(() => {
    cleanupStaleRequests();
  }, QUEUE_CLEANUP_INTERVAL_MS);
}

/**
 * Stop cleanup interval
 */
function stopCleanupInterval(): void {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

/**
 * Add a request to the refresh queue
 * Returns a promise that resolves when token refresh completes
 * If refresh is already in progress, returns the existing refresh promise
 * Includes timeout protection and queue size limits to prevent memory leaks
 */
export function queueRequestForRefresh(): Promise<void> {
  // If refresh is already in progress, return the existing promise
  // All requests will wait for the same refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Check queue size limit to prevent memory leaks
  if (refreshQueue.length >= MAX_REFRESH_QUEUE_SIZE) {
    // Reject oldest request to make room
    const oldestRequest = refreshQueue.shift();
    if (!oldestRequest) {
      // This shouldn't happen, but handle it gracefully
      return Promise.reject(
        new Error(
          `Token refresh queue is full (max ${MAX_REFRESH_QUEUE_SIZE} requests)`,
        ),
      );
    }
    if (oldestRequest.timeoutId) {
      clearTimeout(oldestRequest.timeoutId);
    }
    oldestRequest.reject(
      new Error(
        `Token refresh queue is full (max ${MAX_REFRESH_QUEUE_SIZE} requests)`,
      ),
    );
  }

  // Start cleanup interval if not already running
  startCleanupInterval();

  // Create timeout for this request
  const timeoutId = setTimeout(() => {
    // Find and remove this request from queue
    const index = refreshQueue.findIndex((req) => req.timeoutId === timeoutId);
    if (index !== -1) {
      const request = refreshQueue.splice(index, 1)[0];
      if (request) {
        request.reject(
          new Error(
            `Token refresh request timed out after ${QUEUED_REQUEST_TIMEOUT_MS}ms`,
          ),
        );
      }
    }
  }, QUEUED_REQUEST_TIMEOUT_MS);

  // Otherwise, add to queue and return promise that will resolve when refresh completes
  // The refresh will be started by startRefresh() which will resolve all queued requests
  return new Promise((resolve, reject) => {
    refreshQueue.push({
      resolve,
      reject,
      timestamp: Date.now(),
      timeoutId,
    });
  });
}

/**
 * Start a token refresh operation
 * Returns the refresh promise (reuses existing if already in progress)
 * All queued requests will be resolved/rejected when refresh completes
 * Cleans up timeouts and stops cleanup interval when done
 */
export function startRefresh(refreshFn: () => Promise<void>): Promise<void> {
  // If refresh is already in progress, return existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      await refreshFn();
      // Resolve all queued requests after successful refresh
      const queuedRequests = [...refreshQueue];
      refreshQueue.length = 0;

      // Clear all timeouts before resolving
      queuedRequests.forEach((request) => {
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
        request.resolve();
      });

      // Stop cleanup interval if queue is empty
      if (refreshQueue.length === 0) {
        stopCleanupInterval();
      }
    } catch (error) {
      // Reject all queued requests after failed refresh
      const err = error instanceof Error ? error : new Error(String(error));
      const queuedRequests = [...refreshQueue];
      refreshQueue.length = 0;

      // Clear all timeouts before rejecting
      queuedRequests.forEach((request) => {
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
        request.reject(err);
      });

      // Stop cleanup interval if queue is empty
      if (refreshQueue.length === 0) {
        stopCleanupInterval();
      }

      throw err;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Check if a refresh is currently in progress
 */
export function isRefreshInProgress(): boolean {
  return isRefreshing;
}

/**
 * Get the number of queued requests
 */
export function getQueueLength(): number {
  return refreshQueue.length;
}

/**
 * Clear all queued requests and stop cleanup interval
 * Useful for cleanup on app shutdown or logout
 */
export function clearRefreshQueue(): void {
  const queuedRequests = [...refreshQueue];
  refreshQueue.length = 0;

  // Clear all timeouts and reject all requests
  queuedRequests.forEach((request) => {
    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }
    request.reject(new Error("Token refresh queue cleared"));
  });

  // Stop cleanup interval
  stopCleanupInterval();
}
