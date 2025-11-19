import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { Content, Screen } from "~/components";
import { SessionAddButton } from "~/features/session/session-add-button";
import { SessionRecap } from "~/features/session/session-recap";
import { SessionTodaysList } from "~/features/session/session-todays-list";
import { ProgressCard } from "~/features/stats/progress-card";
import { Suggestions } from "~/features/suggestions/smart-suggestions";
import { trpc } from "~/utils/api";
import { addSuggestionIds } from "~/utils/suggestion-id";

export default function Home() {
  // Fetch all shared data at route level
  const statsQuery = useQuery(trpc.stats.sessions.queryOptions());
  const todaySessionsQuery = useQuery(trpc.session.today.queryOptions());
  const weekSessionsQuery = useQuery(trpc.session.week.queryOptions());
  const suggestionsQuery = useQuery({
    ...trpc.session.suggest.queryOptions({
      type: "DEEP_WORK",
      durationMinutes: 60,
      priority: 3,
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
  const isLoading =
    statsQuery.isLoading ||
    todaySessionsQuery.isLoading ||
    weekSessionsQuery.isLoading;

  if (isLoading) {
    return (
      <Screen contentClassName="items-center justify-center">
        <ActivityIndicator size="large" />
      </Screen>
    );
  }

  return (
    <Screen contentClassName="space-y-4">
      <Content>
        <Text className="text-foreground text-3xl font-bold">Dashboard</Text>
      </Content>

      <Content>
        <SessionRecap
          todaySessions={todaySessionsQuery.data}
          weekSessions={weekSessionsQuery.data}
        />
      </Content>

      <Content>
        <View className="mb-4 flex flex-row items-center justify-between">
          <Text className="text-foreground text-xl font-bold">
            Smart Suggestions
          </Text>
          <Pressable
            onPress={() => {
              router.push({
                pathname: "/suggestions",
                params: {
                  type: "DEEP_WORK",
                  durationMinutes: "60",
                  priority: "3",
                },
              });
            }}
          >
            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color="#71717A"
            />
          </Pressable>
        </View>
      </Content>
      <Suggestions suggestions={suggestions} />

      <Content>
        <View className="mb-4 flex flex-row items-center justify-between">
          <Text className="text-foreground text-xl font-bold">
            Today's Sessions
          </Text>
          <SessionAddButton />
        </View>
        <SessionTodaysList sessions={todaySessionsQuery.data} />
      </Content>

      <Content>
        <ProgressCard stats={statsQuery.data} />
      </Content>
    </Screen>
  );
}
