import { useMemo } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import {
  Button,
  Content,
  ErrorScreen,
  LoadingScreen,
  Screen,
} from "~/components";
import {
  SessionAddButton,
  SessionRecap,
  SessionTodaysList,
} from "~/features/session";
import { ProgressCard } from "~/features/stats";
import { SuggestionsList } from "~/features/suggestions";
import { useQueryError } from "~/hooks/use-query-error";
import { trpc } from "~/utils/api";
import { addSuggestionIds } from "~/utils/suggestion-id";

export default function Home() {
  // Fetch all shared data at route level
  const statsQuery = useQuery(trpc.stats.sessions.queryOptions());
  const todaySessionsForListQuery = useQuery(trpc.session.today.queryOptions());
  const suggestionsQuery = useQuery({
    ...trpc.session.suggest.queryOptions({
      lookAheadDays: 14,
    }),
    placeholderData: (previousData) => previousData,
  });

  // Handle errors consistently
  const statsError = useQueryError(statsQuery);
  const todaySessionsError = useQueryError(todaySessionsForListQuery);
  const suggestionsError = useQueryError(suggestionsQuery);

  // Add idempotency IDs to suggestions for React Query tracking
  const suggestions = useMemo(() => {
    if (!suggestionsQuery.data) return [];
    return addSuggestionIds(suggestionsQuery.data);
  }, [suggestionsQuery.data]);

  // Show unified loading state
  const isLoading = statsQuery.isLoading || todaySessionsForListQuery.isLoading;

  // Show error screen for critical errors (stats, today's sessions, or suggestions)
  if (statsError.hasError || todaySessionsError.hasError || suggestionsError.hasError) {
    const error = statsError.error ?? todaySessionsError.error ?? suggestionsError.error;
    if (error) {
      return (
        <ErrorScreen
          error={error}
          onRetry={() => {
            void statsQuery.refetch();
            void todaySessionsForListQuery.refetch();
            void suggestionsQuery.refetch();
          }}
        />
      );
    }
  }

  if (isLoading) {
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
        <SessionRecap stats={statsQuery.data} />
      </Content>

      <Content>
        <View className="flex flex-row items-center justify-between">
          <Text className="text-foreground text-2xl">Smart Suggestions</Text>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push("/suggestions")}
          >
            <Ionicons
              name="chevron-forward-outline"
              size={22}
              className="text-muted-foreground"
            />
          </Button>
        </View>
      </Content>
      <View style={{ flex: 1 }}>
        <SuggestionsList suggestions={suggestions} horizontal={true} />
      </View>

      <Content>
        <View className="flex flex-row items-center justify-between">
          <Text className="text-foreground text-2xl">Today's Sessions</Text>
          <SessionAddButton />
        </View>
      </Content>
      <View style={{ flex: 1 }}>
        <SessionTodaysList sessions={todaySessionsForListQuery.data} />
      </View>

      <Content>
        <ProgressCard stats={statsQuery.data} />
      </Content>
    </Screen>
  );
}
