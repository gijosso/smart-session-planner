import type React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { trpc } from "~/utils/api";

/**
 * Component to display session statistics
 * Automatically updates when sessions change (via React Query cache invalidation)
 */
export const SessionStats: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery(
    trpc.stats.sessions.queryOptions(),
  );

  if (isLoading) {
    return (
      <View className="p-4">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="p-4">
        <Text className="text-destructive">
          Error loading stats: {error.message}
        </Text>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <View className="p-4">
      <View className="mb-4">
        <Text className="text-foreground mb-2 text-lg font-semibold">
          Session Statistics
        </Text>
        <View className="flex flex-row gap-4">
          <View>
            <Text className="text-muted-foreground text-sm">Total</Text>
            <Text className="text-foreground text-2xl font-bold">
              {stats.total}
            </Text>
          </View>
          <View>
            <Text className="text-muted-foreground text-sm">Completed</Text>
            <Text className="text-success text-2xl font-bold">
              {stats.completed}
            </Text>
          </View>
          <View>
            <Text className="text-muted-foreground text-sm">Pending</Text>
            <Text className="text-warning text-2xl font-bold">
              {stats.pending}
            </Text>
          </View>
          <View>
            <Text className="text-muted-foreground text-sm">Rate</Text>
            <Text className="text-foreground text-2xl font-bold">
              {stats.completionRate}%
            </Text>
          </View>
        </View>
      </View>

      <View>
        <Text className="text-foreground mb-2 text-base font-semibold">
          Breakdown by Type
        </Text>
        {Object.entries(stats.byType).map(([type, count]) => (
          <View
            key={type}
            className="mb-2 flex flex-row items-center justify-between"
          >
            <Text className="text-foreground text-sm">
              {SESSION_TYPES_DISPLAY[type as keyof typeof SESSION_TYPES_DISPLAY]
                ?.label ?? type}
            </Text>
            <Text className="text-foreground text-sm font-medium">{count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

