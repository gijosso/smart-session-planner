import type React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import { Card } from "~/components";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { trpc } from "~/utils/api";

/**
 * Progress card component showing session statistics
 * Displays scheduled, completed, completion rate, and breakdown by type
 */
export const ProgressCard: React.FC = () => {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery(trpc.stats.sessions.queryOptions());

  if (isLoading) {
    return (
      <View className="bg-muted rounded-lg p-4">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-muted rounded-lg p-4">
        <Text className="text-destructive">
          Error loading progress: {error.message}
        </Text>
      </View>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <View className="bg-muted rounded-lg p-4">
        <Text className="text-muted-foreground text-center">
          No sessions yet. Start scheduling to see your progress!
        </Text>
      </View>
    );
  }

  // Get session types that have sessions (non-zero counts)
  const activeTypes = (Object.entries(stats.byType) as [SessionType, number][])
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a); // Sort by count descending

  const totalByType = activeTypes.reduce((sum, [_, count]) => sum + count, 0);

  return (
    <Card>
      <View className="mb-6">
        <Text className="text-foreground text-lg font-semibold">
          Your Progress
        </Text>
      </View>

      <View className="mb-6 flex flex-row justify-between">
        <View className="flex-1">
          <Text className="text-foreground text-3xl font-bold">
            {stats.total}
          </Text>
          <Text className="text-muted-foreground text-sm">Scheduled</Text>
        </View>
        <View className="flex-1">
          <Text className="text-foreground text-3xl font-bold">
            {stats.completed}
          </Text>
          <Text className="text-muted-foreground text-sm">Completed</Text>
        </View>
        <View className="flex-1">
          <Text className="text-foreground text-3xl font-bold">
            {stats.completionRate}%
          </Text>
          <Text className="text-muted-foreground text-sm">Rate</Text>
        </View>
      </View>

      {/* Average Spacing */}
      {stats.averageSpacingHours !== null && (
        <View className="bg-muted mb-4 rounded-lg p-4">
          <Text className="text-foreground mb-1 text-2xl font-bold">
            {stats.averageSpacingHours} days
          </Text>
          <Text className="text-muted-foreground text-sm">
            Average spacing between sessions
          </Text>
        </View>
      )}

      {/* Sessions by Type */}
      {activeTypes.length > 0 && (
        <View>
          <Text className="text-foreground mb-3 text-base font-semibold">
            Sessions by type
          </Text>

          {/* Progress Bar */}
          <View className="bg-background mb-3 h-2 flex-row overflow-hidden rounded-full">
            {activeTypes.map(([type, count]) => (
              <View
                key={type}
                style={{
                  width: `${(count / totalByType) * 100}%`,
                  backgroundColor: SESSION_TYPES_DISPLAY[type].color,
                }}
              />
            ))}
          </View>

          {/* Legend */}
          <View>
            {activeTypes.map(([type, count], index) => (
              <View
                key={type}
                className={`flex flex-row items-center ${index > 0 ? "mt-2" : ""}`}
              >
                <View
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: SESSION_TYPES_DISPLAY[type].color,
                  }}
                />
                <Text className="text-foreground ml-2 text-sm">
                  {SESSION_TYPES_DISPLAY[type].label} · {count}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Streaks */}
      {stats.currentStreakDays > 0 && (
        <View className="mb-4">
          <View className="bg-muted rounded-lg p-4">
            <View className="mb-1 flex flex-row items-center">
              <Text className="text-foreground text-2xl font-bold">
                {stats.currentStreakDays} day
                {stats.currentStreakDays > 1 ? "s" : ""}
              </Text>
              {stats.currentStreakDays === stats.longestStreakDays && (
                <View className="bg-primary ml-2 rounded-full px-2 py-1">
                  <Text className="text-primary-foreground text-xs font-medium">
                    Best
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-muted-foreground text-sm">
              Current streak
            </Text>
          </View>
          {stats.longestStreakDays > stats.currentStreakDays &&
            stats.longestStreakDays > 0 && (
              <View className="bg-muted mt-2 rounded-lg p-4">
                <Text className="text-foreground mb-1 text-2xl font-bold">
                  {stats.longestStreakDays} day
                  {stats.longestStreakDays > 1 ? "s" : ""}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  Longest streak
                </Text>
              </View>
            )}
        </View>
      )}
    </Card>
  );
};
