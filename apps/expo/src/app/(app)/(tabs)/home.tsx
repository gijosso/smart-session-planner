import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import type { SuggestionWithId } from "~/types";
import { Content, ErrorScreen, LoadingScreen, Screen } from "~/components";
import { SkeletonCard } from "~/components/layout/skeleton-loader";
import { FLEX_1_STYLE, SUGGESTION_LOOK_AHEAD_DAYS } from "~/constants/app";
import {
  SessionAddButton,
  SessionRecap,
  SessionTodaysList,
} from "~/features/session";
import { ProgressCard } from "~/features/stats";
import { SmartSuggestionsSection } from "~/features/suggestions";
import { useQueryError } from "~/hooks/use-query-error";
import { trpc } from "~/utils/api";
import { addSuggestionIds } from "~/utils/suggestions/suggestion-id";

export default function Home() {
  // Priority 1: Today's sessions (most critical - user needs to see schedule immediately)
  // Load immediately with high priority
  const todaySessionsForListQuery = useQuery({
    ...trpc.session.today.queryOptions(),
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
  });

  // Priority 2: Stats (important but can show skeleton while loading)
  // Load immediately but allow progressive rendering
  const statsQuery = useQuery({
    ...trpc.stats.sessions.queryOptions(),
    staleTime: 60 * 1000, // Stats can be slightly stale (1 minute)
  });

  // Priority 3: Suggestions (nice-to-have, lazy load after critical data)
  // Only load after critical queries have initial data (not just when not loading)
  // This ensures we don't block suggestions on refetches
  const criticalQueriesHaveData =
    todaySessionsForListQuery.data !== undefined &&
    statsQuery.data !== undefined;
  const suggestionsQuery = useQuery({
    ...trpc.session.suggest.queryOptions({
      lookAheadDays: SUGGESTION_LOOK_AHEAD_DAYS,
    }),
    enabled: criticalQueriesHaveData, // Lazy load: only fetch after critical queries have data
    staleTime: 5 * 60 * 1000, // Suggestions can be stale for 5 minutes
    placeholderData: (previousData) => previousData, // Use cached data if available
  });

  // Handle errors consistently
  const statsError = useQueryError(statsQuery);
  const todaySessionsError = useQueryError(todaySessionsForListQuery);
  const suggestionsError = useQueryError(suggestionsQuery);

  // Add idempotency IDs to suggestions for React Query tracking
  // Only process if data exists and hasn't been processed yet
  const suggestions: SuggestionWithId[] = useMemo(() => {
    if (!suggestionsQuery.data) {
      return [];
    }
    return addSuggestionIds(suggestionsQuery.data);
  }, [suggestionsQuery.data]);

  // Show unified loading state (only for critical queries)
  const isInitialLoading =
    statsQuery.isLoading || todaySessionsForListQuery.isLoading;

  // Progressive loading: show skeleton for individual sections while data loads
  const isSuggestionsLoading =
    suggestionsQuery.isLoading && !suggestionsQuery.data;

  // Memoize retry handlers - separate for critical vs non-critical
  const handleRetryCritical = useCallback(() => {
    void statsQuery.refetch();
    void todaySessionsForListQuery.refetch();
  }, [statsQuery, todaySessionsForListQuery]);

  const handleRetrySuggestions = useCallback(() => {
    void suggestionsQuery.refetch();
  }, [suggestionsQuery]);

  // Show error screen only for critical errors (stats or today's sessions)
  // Suggestions errors are handled inline
  if (statsError.hasError || todaySessionsError.hasError) {
    const error = statsError.error ?? todaySessionsError.error;
    if (error) {
      return <ErrorScreen error={error} onRetry={handleRetryCritical} />;
    }
  }

  if (isInitialLoading) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Content>
        <Text className="text-foreground text-3xl font-semibold">
          Dashboard
        </Text>
      </Content>

      <Content>
        {statsQuery.isLoading ? (
          <SkeletonCard />
        ) : (
          <SessionRecap stats={statsQuery.data} />
        )}
      </Content>

      <SmartSuggestionsSection
        suggestions={suggestions}
        isLoading={isSuggestionsLoading}
        error={suggestionsError.hasError ? suggestionsError.error : undefined}
        onRetry={handleRetrySuggestions}
      />

      <Content>
        <View className="flex flex-row items-center justify-between">
          <Text className="text-foreground text-2xl" accessibilityRole="header">
            Today's Sessions
          </Text>
          <SessionAddButton />
        </View>
      </Content>
      <View style={FLEX_1_STYLE}>
        <SessionTodaysList sessions={todaySessionsForListQuery.data} />
      </View>

      <Content>
        <ProgressCard stats={statsQuery.data} />
      </Content>
    </Screen>
  );
}
