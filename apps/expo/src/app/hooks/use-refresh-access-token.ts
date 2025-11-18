import type { AppStateStatus } from "react-native";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { refreshAccessToken, trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export const useRefreshAccessToken = () => {
  const { data: session, isLoading } = useQuery(
    trpc.auth.getSession.queryOptions(),
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!session?.user) {
      // Clear interval if user is not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Function to check and refresh token if needed
    const checkAndRefreshToken = async () => {
      try {
        const isExpired = await authClient.isTokenExpired();
        if (isExpired) {
          await refreshAccessToken();
        }
      } catch (error) {
        // Silently fail - token refresh will be retried on next API call
        console.error("Failed to refresh token in background:", error);
      }
    };

    // Initial check
    void checkAndRefreshToken();

    // Set up periodic refresh
    intervalRef.current = setInterval(() => {
      void checkAndRefreshToken();
    }, REFRESH_INTERVAL_MS);

    // Handle app state changes (foreground/background)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      // When app comes to foreground, check and refresh token if needed
      if (
        /inactive|background/.test(appStateRef.current) &&
        nextAppState === "active"
      ) {
        void checkAndRefreshToken();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, [session?.user]);
  return { isLoading };
};
