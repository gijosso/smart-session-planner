/**
 * Token refresh queue to handle concurrent 401 requests
 * Prevents race conditions when multiple requests fail simultaneously
 */

interface QueuedRequest {
  resolve: (value: void) => void;
  reject: (error: Error) => void;
  timestamp: number;
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
 * Add a request to the refresh queue
 * Returns a promise that resolves when token refresh completes
 * If refresh is already in progress, returns the existing refresh promise
 */
export function queueRequestForRefresh(): Promise<void> {
  // If refresh is already in progress, return the existing promise
  // All requests will wait for the same refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Otherwise, add to queue and return promise that will resolve when refresh completes
  // The refresh will be started by startRefresh() which will resolve all queued requests
  return new Promise((resolve, reject) => {
    refreshQueue.push({
      resolve,
      reject,
      timestamp: Date.now(),
    });
  });
}

/**
 * Start a token refresh operation
 * Returns the refresh promise (reuses existing if already in progress)
 * All queued requests will be resolved/rejected when refresh completes
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
      queuedRequests.forEach((request) => request.resolve());
    } catch (error) {
      // Reject all queued requests after failed refresh
      const err = error instanceof Error ? error : new Error(String(error));
      const queuedRequests = [...refreshQueue];
      refreshQueue.length = 0;
      queuedRequests.forEach((request) => request.reject(err));
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
