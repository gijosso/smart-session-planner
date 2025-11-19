import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { formatDateShort } from "~/utils/date";
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
    <View className="flex flex-col">
      <View className="mb-4 flex flex-row items-start justify-between">
        <View>
          <Text className="text-foreground text-2xl font-bold">
            {formatDateShort(new Date())}
          </Text>
          <Text className="text-muted-foreground mt-1 text-sm">
            {filter === "today"
              ? "Your schedule today"
              : "Your schedule this week"}
          </Text>
        </View>
        <SessionRecapFilter filter={filter} onFilterChange={setFilter} />
      </View>
      <SessionRecapDisplay sessions={sessions ?? []} />
    </View>
  );
};
