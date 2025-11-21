import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { SUGGESTION_LOOK_AHEAD_DAYS } from "~/constants/app";
import { trpc } from "~/utils/api";

/**
 * Hook to prefetch home page data when user is authenticated
 * Uses prioritized prefetching:
 * 1. Today's sessions (critical - highest priority)
 * 2. Stats (important - medium priority)
 * 3. Suggestions (nice-to-have - lowest priority, lazy loaded)
 */
export const usePrefetchHome = (isAuthenticated: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated) {
      // Priority 1: Prefetch critical queries first (today's sessions)
      // This ensures the most important data is available immediately
      const criticalPrefetch = queryClient.prefetchQuery(
        trpc.session.today.queryOptions(),
      );

      // Priority 2: Prefetch stats after critical query starts
      // Stats can load in parallel but are less critical
      const statsPrefetch = queryClient.prefetchQuery(
        trpc.stats.sessions.queryOptions(),
      );

      // Priority 3: Suggestions are lazy loaded in the component
      // Only prefetch if critical queries succeed (deferred)
      void Promise.all([criticalPrefetch, statsPrefetch]).then(() => {
        // Prefetch suggestions after critical data is loaded
        // This reduces initial load time while still warming the cache
        void queryClient.prefetchQuery(
          trpc.session.suggest.queryOptions({
            lookAheadDays: SUGGESTION_LOOK_AHEAD_DAYS,
          }),
        );
      });
    }
  }, [isAuthenticated, queryClient]);
};

