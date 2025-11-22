import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { SuggestionWithId } from "~/types";
import { SUGGESTIONS_PAGE_SIZE } from "~/constants/app";
import { trpc } from "~/utils/api";
import { addSuggestionIds } from "~/utils/suggestions/suggestion-id";

export interface UsePaginatedSuggestionsOptions {
  lookAheadDays?: number;
  pageSize?: number;
}

export interface UsePaginatedSuggestionsResult {
  /** All accumulated suggestions across all loaded pages */
  suggestions: SuggestionWithId[];
  /** Whether more suggestions are available */
  hasMore: boolean;
  /** Whether the initial page is loading */
  isLoading: boolean;
  /** Whether a subsequent page is loading */
  isLoadingMore: boolean;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Function to load the next page */
  loadMore: () => void;
  /** Function to refresh and reset pagination */
  refresh: () => void;
  /** Whether this is the initial load */
  isInitialLoad: boolean;
}

/**
 * Custom hook for paginated suggestions
 * Handles accumulating suggestions across pages and managing pagination state
 */
export function usePaginatedSuggestions(
  options: UsePaginatedSuggestionsOptions = {},
): UsePaginatedSuggestionsResult {
  const { lookAheadDays, pageSize = SUGGESTIONS_PAGE_SIZE } = options;
  const [offset, setOffset] = useState(0);
  const [accumulatedSuggestions, setAccumulatedSuggestions] = useState<
    SuggestionWithId[]
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: rawSuggestions,
    isLoading,
    refetch,
  } = useQuery(
    trpc.session.suggest.queryOptions({
      lookAheadDays,
      limit: pageSize,
      offset,
    }),
  );

  // Process current page suggestions
  const currentPageSuggestions: SuggestionWithId[] = useMemo(() => {
    if (!rawSuggestions) return [];
    // Check if IDs already exist (optimization to avoid unnecessary processing)
    const hasIds = rawSuggestions.some(
      (s) => "id" in s && typeof s.id === "string",
    );
    if (hasIds) {
      return rawSuggestions as SuggestionWithId[];
    }
    return addSuggestionIds(rawSuggestions);
  }, [rawSuggestions]);

  // Accumulate suggestions when new page loads
  useEffect(() => {
    if (currentPageSuggestions.length === 0) return;

    if (offset === 0) {
      // First page - replace all
      setAccumulatedSuggestions(currentPageSuggestions);
      setIsRefreshing(false);
    } else {
      // Subsequent pages - merge with existing, avoiding duplicates
      setAccumulatedSuggestions((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newSuggestions = currentPageSuggestions.filter(
          (s) => !existingIds.has(s.id),
        );
        return [...prev, ...newSuggestions];
      });
    }
  }, [currentPageSuggestions, offset]);

  // Determine if there are more suggestions
  const hasMore = useMemo(() => {
    // If we got a full page, there might be more
    if (currentPageSuggestions.length === pageSize) {
      return true;
    }
    // If we got fewer than a full page, we've reached the end
    return false;
  }, [currentPageSuggestions.length, pageSize]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore && !isRefreshing) {
      setOffset((prev) => prev + pageSize);
    }
  }, [isLoading, hasMore, isRefreshing, pageSize]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setOffset(0);
    // Don't clear accumulated suggestions immediately - keep them visible during refresh
    // They will be replaced when new data arrives (when offset === 0 in useEffect)
    void refetch();
  }, [refetch]);

  const isInitialLoad = offset === 0 && isLoading && !rawSuggestions;
  const isLoadingMore = offset > 0 && isLoading;

  return {
    suggestions: accumulatedSuggestions,
    hasMore,
    isLoading: isInitialLoad,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    isInitialLoad,
  };
}


