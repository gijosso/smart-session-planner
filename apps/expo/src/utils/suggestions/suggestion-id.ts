import type { QueryClient } from "@tanstack/react-query";

import type { SessionType, SuggestedSession } from "@ssp/api/client";

import { SUGGESTION_LOOK_AHEAD_DAYS } from "~/constants/app";
import type { SuggestionWithId } from "~/types";
import { trpc } from "~/utils/api";

/**
 * Generate a unique ID for a suggestion based on its time range
 * This creates an idempotent ID that will be the same for the same time slot
 */
export function generateSuggestionId(suggestion: SuggestedSession): string {
  // Use timestamp combination as idempotent ID
  // Same time slot will always generate the same ID
  // No collisions
  return `${suggestion.startTime.getTime()}-${suggestion.endTime.getTime()}`;
}

/**
 * Add idempotency IDs to suggestions array
 * Transforms suggestions to include a unique ID for React Query tracking
 */
export function addSuggestionIds(
  suggestions: SuggestedSession[],
): SuggestionWithId[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    id: generateSuggestionId(suggestion),
  }));
}

/**
 * Remove a suggestion from the React Query cache by its idempotency ID
 * Uses React Query's setQueryData internally for cache updates
 */
function removeSuggestionFromCache(
  queryClient: QueryClient,
  suggestionId: string,
  queryParams: {
    lookAheadDays?: number;
  },
): SuggestedSession[] | undefined {
  const queryOptions = trpc.session.suggest.queryOptions({
    lookAheadDays: queryParams.lookAheadDays ?? SUGGESTION_LOOK_AHEAD_DAYS,
  });

  // Get current data
  const oldData = queryClient.getQueryData<SuggestedSession[]>(
    queryOptions.queryKey,
  );

  if (!oldData) return undefined;

  // Add IDs to old data if they don't have them (for React Query tracking)
  const oldDataWithIds = addSuggestionIds(oldData);

  // Filter out the suggestion by ID
  const newData = oldDataWithIds.filter(
    (suggestion) => suggestion.id !== suggestionId,
  );

  // Update cache using React Query's setQueryData
  queryClient.setQueryData(queryOptions.queryKey, newData);

  return oldDataWithIds; // Return previous data for rollback
}

/**
 * Remove a suggestion from the React Query cache by its idempotency ID
 * This can be called from anywhere to invalidate/remove a specific suggestion
 * @deprecated Use getSuggestionMutationOptions instead for React Query-native approach
 */
export function invalidateSuggestionById(
  queryClient: QueryClient,
  suggestionId: string,
  queryParams: {
    lookAheadDays?: number;
  },
): void {
  removeSuggestionFromCache(queryClient, suggestionId, queryParams);
}

/**
 * Get React Query mutation options with optimistic updates for suggestion removal
 * Uses React Query's onMutate/onError/onSettled lifecycle hooks
 */
export function getSuggestionMutationOptions<
  TVariables extends { fromSuggestionId?: string },
>(
  queryClient: QueryClient,
  queryParams: {
    lookAheadDays?: number;
  } = {},
) {
  return {
    onMutate: async (variables: TVariables) => {
      if (!variables.fromSuggestionId) {
        return { previousData: undefined as SuggestedSession[] | undefined };
      }

      const queryOptions = trpc.session.suggest.queryOptions({
        lookAheadDays: queryParams.lookAheadDays ?? SUGGESTION_LOOK_AHEAD_DAYS,
      });

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryOptions.queryKey });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData<SuggestedSession[]>(
        queryOptions.queryKey,
      );

      // Optimistically remove the suggestion
      removeSuggestionFromCache(
        queryClient,
        variables.fromSuggestionId,
        queryParams,
      );

      // Return a context object with the snapshotted value for rollback
      return { previousData };
    },
    onError: (
      _err: unknown,
      _variables: TVariables,
      onMutateResult: { previousData?: SuggestedSession[] } | undefined,
      _mutation: unknown,
    ) => {
      // If the mutation fails, rollback to the previous value
      if (onMutateResult?.previousData) {
        const queryOptions = trpc.session.suggest.queryOptions({
          lookAheadDays: queryParams.lookAheadDays ?? SUGGESTION_LOOK_AHEAD_DAYS,
        });
        queryClient.setQueryData(queryOptions.queryKey, onMutateResult.previousData);
      }
    },
    onSettled: (
      _data: unknown,
      _error: unknown,
      _variables: TVariables,
      _onMutateResult: { previousData?: SuggestedSession[] } | undefined,
    ) => {
      // Always refetch after error or success to ensure consistency
      const queryOptions = trpc.session.suggest.queryOptions({
        lookAheadDays: queryParams.lookAheadDays ?? SUGGESTION_LOOK_AHEAD_DAYS,
      });
      void queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    },
  };
}

/**
 * Invalidate all suggestion queries (forces refetch)
 * Useful when you want to refresh all suggestions
 */
export function invalidateAllSuggestions(
  queryClient: QueryClient,
  queryParams: {
    type: SessionType;
    durationMinutes: number;
    priority: number;
    lookAheadDays?: number;
  },
): void {
  const queryOptions = trpc.session.suggest.queryOptions({
    lookAheadDays: queryParams.lookAheadDays ?? SUGGESTION_LOOK_AHEAD_DAYS,
  });

  void queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
}
