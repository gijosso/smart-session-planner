import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { SUGGESTION_LOOK_AHEAD_DAYS } from "~/constants/app";
import { trpc } from "~/utils/api";

/**
 * Hook to prefetch home page data when user is authenticated
 * Prefetches stats, today's sessions, and suggestions in parallel
 */
export const usePrefetchHome = (isAuthenticated: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated) {
      // Prefetch all home page queries in parallel
      void Promise.all([
        queryClient.prefetchQuery(trpc.stats.sessions.queryOptions()),
        queryClient.prefetchQuery(trpc.session.today.queryOptions()),
        queryClient.prefetchQuery(
          trpc.session.suggest.queryOptions({
            lookAheadDays: SUGGESTION_LOOK_AHEAD_DAYS,
          }),
        ),
      ]);
    }
  }, [isAuthenticated, queryClient]);
};

