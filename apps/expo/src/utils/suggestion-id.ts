import type { QueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import { trpc } from "~/utils/api";

/**
 * Generate a unique ID for a suggestion based on its time range
 * This creates an idempotent ID that will be the same for the same time slot
 */
export function generateSuggestionId(suggestion: {
  startTime: Date;
  endTime: Date;
}): string {
  // Use timestamp combination as idempotent ID
  // Same time slot will always generate the same ID
  // No collisions
  return `${suggestion.startTime.getTime()}-${suggestion.endTime.getTime()}`;
}

/**
 * Add idempotency IDs to suggestions array
 * Transforms suggestions to include a unique ID for React Query tracking
 */
export function addSuggestionIds<T extends { startTime: Date; endTime: Date }>(
  suggestions: T[],
): (T & { id: string })[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    id: generateSuggestionId(suggestion),
  }));
}

/**
 * Remove a suggestion from the React Query cache by its idempotency ID
 * This can be called from anywhere to invalidate/remove a specific suggestion
 */
export function invalidateSuggestionById(
  queryClient: QueryClient,
  suggestionId: string,
  queryParams: {
    lookAheadDays?: number;
  },
): void {
  // Get the query options to access the query key
  const queryOptions = trpc.session.suggest.queryOptions({
    lookAheadDays: queryParams.lookAheadDays ?? 14,
  });

  // Update the cache to remove the suggestion by ID
  queryClient.setQueryData(queryOptions.queryKey, (oldData) => {
    if (!oldData) return oldData;

    // Add IDs to old data if they don't have them (for React Query tracking)
    const oldDataWithIds = addSuggestionIds(oldData);

    // Filter out the suggestion by ID
    // Keep IDs as they're part of the SuggestedSession type from the API
    return oldDataWithIds.filter(
      (suggestion) => suggestion.id !== suggestionId,
    );
  });
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
    lookAheadDays: queryParams.lookAheadDays ?? 14,
  });

  void queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
}
