import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@ssp/api";

import { authClient } from "./auth";
import { getBaseUrl } from "./base-url";

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
        return Math.min(1000 * 2 ** attemptIndex, 30000);
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
      retryDelay: 1000,
      // Network mode for mutations
      networkMode: "online",
    },
  },
});

// Track if a refresh is in progress to avoid multiple simultaneous refreshes
let refreshPromise: Promise<void> | null = null;

/**
 * Refresh the access token using the stored refresh token
 * Exported for use in components that need to manually trigger refresh
 */
export async function refreshAccessToken(): Promise<void> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = await authClient.getRefreshToken();
      if (!refreshToken) {
        // No refresh token available, clear session
        await authClient.removeAccessToken();
        return;
      }

      // Call refresh endpoint directly using fetch to avoid typing issues
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/trpc/auth.refreshToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          json: { refreshToken },
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        result: {
          data: {
            json: {
              accessToken: string;
              refreshToken: string | null;
              expiresAt: number | null;
            };
          };
        };
      };

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
    } catch (error) {
      // Refresh failed, clear session
      await authClient.removeAccessToken();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

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
              await refreshAccessToken();
              // Retry the request with the new token
              const newHeaders = new Headers(options?.headers);
              const authHeader = await authClient.getAuthHeader();
              if (authHeader) {
                newHeaders.set("Authorization", authHeader);
              }
              return fetch(url, {
                ...options,
                headers: newHeaders,
              });
            } catch {
              // Refresh failed, return original 401 response
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
