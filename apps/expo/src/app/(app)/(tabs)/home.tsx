import { useMemo } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { Button, Content, LoadingScreen, Screen } from "~/components";
import { SessionAddButton } from "~/features/session/session-add-button";
import { SessionRecap } from "~/features/session/session-recap";
import { SessionTodaysList } from "~/features/session/session-todays-list";
import { ProgressCard } from "~/features/stats/progress-card";
import { SuggestionsList } from "~/features/suggestions/smart-suggestions/suggestions-list";
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

  // Add idempotency IDs to suggestions for React Query tracking
  const suggestions = useMemo(() => {
    if (!suggestionsQuery.data) return [];
    return addSuggestionIds(suggestionsQuery.data);
  }, [suggestionsQuery.data]);

  // Show unified loading state
  const isLoading = statsQuery.isLoading || todaySessionsForListQuery.isLoading;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Content className="pb-0">
        <Text className="text-foreground text-3xl font-semibold">
          Dashboard
        </Text>
      </Content>

      <Content>
        <SessionRecap stats={statsQuery.data} />
      </Content>

      <Content className="pb-0">
        <View className="flex flex-row items-center justify-between">
          <Text className="text-foreground text-2xl">Smart Suggestions</Text>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push("/suggestions")}
          >
            <Ionicons
              name="chevron-forward-outline"
              size={20}
              className="text-muted-foreground"
            />
          </Button>
        </View>
      </Content>
      <View>
        <SuggestionsList suggestions={suggestions} horizontal={true} />
      </View>

      <Content>
        <View className="mb-4 flex flex-row items-center justify-between">
          <Text className="text-foreground text-2xl">Today's Sessions</Text>
          <SessionAddButton />
        </View>
        <SessionTodaysList sessions={todaySessionsForListQuery.data} />
      </Content>

      <Content>
        <ProgressCard stats={statsQuery.data} />
      </Content>
    </Screen>
  );
}
