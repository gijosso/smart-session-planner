import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@ssp/api";

import {
  DEFAULT_RETRY_DELAY_MS,
  MAX_REFRESH_RETRIES,
  MAX_RETRY_DELAY_MS,
  REFRESH_TIMEOUT_MS,
  STALE_REFRESH_THRESHOLD_MS,
} from "~/constants/api";
import { authClient } from "./auth";
import { getBaseUrl } from "./base-url";
import { safeParse } from "./safe-json";

/**
 * QueryClient configuration with sensible defaults for React Native
 *
 * Defaults are optimized for mobile apps:
 * - Retry failed requests with exponential backoff
 * - Refetch on reconnect
 * - Reasonable cache times for offline support
 * - Network-aware behavior
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on client errors (4xx) or authentication errors
        if (typeof error === "object" && "data" in error) {
          const errorData = error.data as
            | { code?: string; httpStatus?: number }
            | undefined;

          // Don't retry authentication errors
          if (errorData?.code === "UNAUTHORIZED") {
            return false;
          }

          // Don't retry on 4xx client errors (bad request, not found, etc.)
          if (
            errorData?.httpStatus &&
            errorData.httpStatus >= 400 &&
            errorData.httpStatus < 500
          ) {
            return false;
          }
        }
        // Retry up to 3 times for network errors and 5xx server errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s
        return Math.min(
          DEFAULT_RETRY_DELAY_MS * 2 ** attemptIndex,
          MAX_RETRY_DELAY_MS,
        );
      },
      // Stale time: how long data is considered fresh
      // Default to 0 (always refetch) - individual queries can override
      staleTime: 0,
      // Cache time (gcTime in v5): how long unused data stays in cache
      // 5 minutes default - allows offline viewing of recently accessed data
      gcTime: 5 * 60 * 1000, // 5 minutes
      // Refetch behavior
      refetchOnWindowFocus: false, // Mobile apps don't have window focus
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts (can be overridden)
      // Network mode
      networkMode: "online", // Only run queries when online
      // Structural sharing: enabled by default, helps with performance
      structuralSharing: true,
    },
    mutations: {
      // Retry mutations once on network errors
      retry: 1,
      retryDelay: DEFAULT_RETRY_DELAY_MS,
      // Network mode for mutations
      networkMode: "online",
    },
  },
});

// Token refresh configuration - imported from constants

// Track if a refresh is in progress to avoid multiple simultaneous refreshes
interface RefreshState {
  promise: Promise<void>;
  timestamp: number;
}

let refreshState: RefreshState | null = null;

/**
 * Create a fetch request with timeout protection using AbortController
 * Properly cancels the fetch request if timeout occurs to prevent memory leaks
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Token refresh timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Refresh the access token using the stored refresh token
 * Exported for use in components that need to manually trigger refresh
 *
 * Features:
 * - Prevents concurrent refresh attempts (race condition protection)
 * - Timeout protection (10 seconds)
 * - Retry logic with exponential backoff
 * - Proper error handling and cleanup
 */
export async function refreshAccessToken(): Promise<void> {
  // If a refresh is already in progress and recent, wait for it
  if (refreshState) {
    const age = Date.now() - refreshState.timestamp;
    if (age < STALE_REFRESH_THRESHOLD_MS) {
      // Recent refresh in progress, wait for it
      return refreshState.promise;
    }
    // Stale refresh promise, reset and start fresh
    refreshState = null;
  }

  // Create new refresh promise with timeout protection
  const refreshPromise = (async (): Promise<void> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_REFRESH_RETRIES; attempt++) {
      try {
        const refreshToken = await authClient.getRefreshToken();
        if (!refreshToken) {
          // No refresh token available, clear session
          await authClient.removeAccessToken();
          throw new Error("No refresh token available");
        }

        // Call refresh endpoint with timeout protection using AbortController
        const baseUrl = getBaseUrl();
        const response = await fetchWithTimeout(
          `${baseUrl}/api/trpc/auth.refreshToken`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              json: { refreshToken },
            }),
          },
          REFRESH_TIMEOUT_MS,
        );

        if (!response.ok) {
          throw new Error(`Token refresh failed: ${response.statusText}`);
        }

        // Safely parse JSON response with error handling
        const responseText = await response.text();
        const data = safeParse<{
          result: {
            data: {
              json: {
                accessToken: string;
                refreshToken: string | null;
                expiresAt: number | null;
              };
            };
          };
        }>(responseText);

        if (!data) {
          throw new Error("Invalid JSON response from token refresh endpoint");
        }

        const result = data.result.data.json;
        if (!result.accessToken) {
          throw new Error("No result returned from token refresh");
        }

        // Store the new session tokens
        await authClient.setSession({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken ?? null,
          expiresAt: result.expiresAt ?? null,
        });

        // Success - exit retry loop
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors (e.g., no refresh token, invalid response)
        if (
          lastError.message.includes("No refresh token") ||
          lastError.message.includes("No result returned")
        ) {
          await authClient.removeAccessToken();
          throw lastError;
        }

        // If this was the last attempt, throw the error
        if (attempt === MAX_REFRESH_RETRIES) {
          await authClient.removeAccessToken();
          throw lastError;
        }

        // Exponential backoff: wait before retrying (1s, 2s)
        const delay = 1000 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError ?? new Error("Token refresh failed after all retries");
  })();

  // Track the refresh state
  refreshState = {
    promise: refreshPromise,
    timestamp: Date.now(),
  };

  // Clean up state when promise resolves or rejects
  refreshPromise
    .then(() => {
      refreshState = null;
    })
    .catch(() => {
      refreshState = null;
    });

  return refreshPromise;
}

/**
 * Ensure token is valid, refreshing if necessary
 */
async function ensureValidToken(): Promise<void> {
  const isExpired = await authClient.isTokenExpired();
  if (isExpired) {
    await refreshAccessToken();
  }
}

/**
 * A set of typesafe hooks for consuming your API.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient({
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
        colorMode: "ansi",
      }),
      httpBatchLink({
        transformer: superjson,
        url: `${getBaseUrl()}/api/trpc`,
        async headers() {
          // Ensure token is valid before making request
          await ensureValidToken();

          const headers = new Map<string, string>();
          headers.set("x-trpc-source", "expo-react");

          // Prefer Authorization header over cookies for better compatibility
          const authHeader = await authClient.getAuthHeader();
          if (authHeader) {
            headers.set("Authorization", authHeader);
          } else {
            // Fallback to cookies if Authorization header is not available
            const cookies = await authClient.getCookie();
            if (cookies) {
              headers.set("Cookie", cookies);
            }
          }
          return headers;
        },
        // Handle 401 errors by attempting to refresh token
        fetch: async (url, options) => {
          const response = await fetch(url, options);

          // If we get a 401, try to refresh the token and retry once
          if (response.status === 401) {
            try {
              // Wait for any in-progress refresh or start a new one
              await refreshAccessToken();

              // Retry the request with the new token
              const newHeaders = new Headers(options?.headers);
              const authHeader = await authClient.getAuthHeader();
              if (authHeader) {
                newHeaders.set("Authorization", authHeader);
              } else {
                // Fallback to cookies if Authorization header is not available
                const cookies = await authClient.getCookie();
                if (cookies) {
                  newHeaders.set("Cookie", cookies);
                }
              }

              return fetch(url, {
                ...options,
                headers: newHeaders,
              });
            } catch (error) {
              // Refresh failed, return original 401 response
              // Error is already logged/handled in refreshAccessToken
              console.error(error);
              return response;
            }
          }

          return response;
        },
      }),
    ],
  }),
  queryClient,
});

export type { RouterInputs, RouterOutputs } from "@ssp/api";
