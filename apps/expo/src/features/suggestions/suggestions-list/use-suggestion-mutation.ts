import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SuggestionWithId } from "~/types";
import { SUGGESTION_LOOK_AHEAD_DAYS } from "~/constants/app";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { invalidateSessionQueries } from "~/utils/sessions/session-cache";
import { getSuggestionMutationOptions } from "~/utils/suggestions/suggestion-id";

/**
 * Hook for handling suggestion mutation logic
 * Manages creating a session from a suggestion with optimistic updates
 */
export function useSuggestionMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const createSessionMutation = useMutation(
    trpc.session.create.mutationOptions({
      ...getSuggestionMutationOptions(queryClient, {
        lookAheadDays: SUGGESTION_LOOK_AHEAD_DAYS,
      }),
      onSuccess: (data, _variables) => {
        // Invalidate queries based on session date (granular invalidation)
        invalidateSessionQueries(queryClient, {
          startTime: data.startTime,
          id: data.id,
        });
        toast.success("Session created successfully");
      },
      onError: (error: unknown) => {
        createMutationErrorHandler({
          errorMessage: "Failed to create session. Please try again.",
        })(error);
      },
    }),
  );

  const handleAccept = useCallback(
    (suggestion: SuggestionWithId) => {
      createSessionMutation.mutate({
        title: suggestion.title,
        type: suggestion.type,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        priority: suggestion.priority,
        description: suggestion.description,
        fromSuggestionId: suggestion.id,
        allowConflicts: false,
      });
    },
    [createSessionMutation],
  );

  return {
    createSessionMutation,
    handleAccept,
  };
}

