/**
 * Clear All Sessions Button
 * Development tool to delete all sessions for testing purposes
 */

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";

/**
 * Button to delete all sessions for the current user
 * Development/testing utility
 */
export function ClearAllSessionsButton() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const clearAllSessionsMutation = useMutation(
    trpc.session.deleteAll.mutationOptions({
      onSuccess: () => {
        // Invalidate all session-related queries comprehensively
        // Since we're deleting ALL sessions, we need to invalidate everything

        // Invalidate all session queries using query filters
        void queryClient.invalidateQueries(trpc.session.today.queryFilter());
        void queryClient.invalidateQueries(trpc.session.week.queryFilter());
        void queryClient.invalidateQueries(trpc.session.suggest.queryFilter());

        // Invalidate all session byId queries (any individual session queries)
        void queryClient.invalidateQueries({
          predicate: (query) => {
            return (
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === "session" &&
              query.queryKey[1] === "byId"
            );
          },
        });

        // Invalidate stats queries (since deleting all sessions affects stats)
        void queryClient.invalidateQueries(trpc.stats.sessions.queryFilter());

        // Invalidate all other session-related queries using predicate
        void queryClient.invalidateQueries({
          predicate: (query) => {
            return (
              Array.isArray(query.queryKey) && query.queryKey[0] === "session"
            );
          },
        });

        toast.success("All sessions cleared successfully", "Sessions Cleared");
      },
      onError: createMutationErrorHandler({
        errorMessage: "Failed to clear all sessions. Please try again.",
      }),
    }),
  );

  const handleClearAll = useCallback(() => {
    clearAllSessionsMutation.mutate();
  }, [clearAllSessionsMutation]);

  return (
    <Button
      variant="outline"
      onPress={handleClearAll}
      disabled={clearAllSessionsMutation.isPending}
      accessibilityLabel="Clear all sessions"
      accessibilityRole="button"
    >
      {clearAllSessionsMutation.isPending
        ? "DEV: Clearing Sessions..."
        : "DEV: Clear All Sessions"}
    </Button>
  );
}
