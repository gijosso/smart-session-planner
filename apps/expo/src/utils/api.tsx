import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@ssp/api";

import { authClient } from "./auth";
import { getBaseUrl } from "./base-url";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ...
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
