import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { SessionRecapDisplay } from "./session-recap-display";
import { SessionRecapFilter } from "./session-recap-filter";

export type FilterType = "today" | "week";

export const SessionRecap: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>("today");
  const todayQuery = useQuery(trpc.session.today.queryOptions());
  const weekQuery = useQuery(trpc.session.week.queryOptions());

  const sessionsQuery = filter === "today" ? todayQuery : weekQuery;
  const { data: sessions, isLoading, error } = sessionsQuery;

  if (isLoading) {
    return (
      <View className="py-4">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="py-4">
        <Text className="text-destructive">
          Error loading sessions: {error.message}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View className="mb-3 flex flex-row items-start justify-between">
        <SessionRecapDisplay sessions={sessions ?? []} filter={filter} />
        <View className="ml-4 pt-1">
          <SessionRecapFilter filter={filter} onFilterChange={setFilter} />
        </View>
      </View>
    </View>
  );
};
