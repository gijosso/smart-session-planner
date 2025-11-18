import { ActivityIndicator, Text, View } from "react-native";
import { LegendList } from "@legendapp/list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { SessionItem } from "./session-item";

export const TodaysSessions = () => {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery(trpc.session.today.queryOptions());

  const toggleCompleteMutation = useMutation(
    trpc.session.toggleComplete.mutationOptions({
      onSettled: () => {
        void queryClient.invalidateQueries(trpc.session.today.queryFilter());
      },
    }),
  );

  if (sessionsQuery.isLoading) {
    return (
      <View className="py-4">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (sessionsQuery.error) {
    return (
      <View className="py-4">
        <Text className="text-destructive">
          Error loading sessions: {sessionsQuery.error.message}
        </Text>
      </View>
    );
  }

  const sessions = sessionsQuery.data ?? [];

  if (sessions.length === 0) {
    return (
      <View className="py-4">
        <Text className="text-muted-foreground text-center">
          No sessions scheduled for today
        </Text>
      </View>
    );
  }

  return (
    <LegendList
      data={sessions}
      estimatedItemSize={20}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={(p) => (
        <SessionItem
          session={p.item}
          onToggleComplete={() =>
            toggleCompleteMutation.mutate({ id: p.item.id })
          }
        />
      )}
    />
  );
};
