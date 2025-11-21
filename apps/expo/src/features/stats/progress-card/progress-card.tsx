import React, { memo } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { RouterOutputs } from "~/utils/api";
import { Card } from "~/components/card";
import { CardContent } from "~/components/card";
import { CardHeader } from "~/components/card";
import { AverageSpacing } from "./average-spacing";
import { SessionsByType } from "./sessions-by-type";
import { StatsOverview } from "./stats-overview";
import { Streaks } from "./streaks";

type SessionStats = RouterOutputs["stats"]["sessions"];

interface ProgressCardProps {
  stats: SessionStats | undefined;
}

/**
 * Progress card component showing session statistics
 * Displays scheduled, completed, completion rate, and breakdown by type
 * Memoized to prevent unnecessary re-renders when parent re-renders
 */
export const ProgressCard = memo<ProgressCardProps>(({ stats }) => {
  if (!stats || stats.total === 0) {
    return null;
  }

  return (
    <Card variant="muted" className="bg-progress-card">
      <CardHeader>
        <View className="flex flex-row items-center gap-2">
          <Ionicons name="disc-outline" size={26} />
          <Text className="text-foreground text-2xl">Your Progress</Text>
        </View>
      </CardHeader>

      <CardContent className="gap-6">
        <View>
          <View className="mb-6 py-4">
            <StatsOverview
              total={stats.total}
              completed={stats.completed}
              completionRate={stats.completionRate}
            />
          </View>

          <SessionsByType byType={stats.byType} />
        </View>

        <AverageSpacing averageSpacingHours={stats.averageSpacingHours} />

        <Streaks
          currentStreakDays={stats.currentStreakDays}
          longestStreakDays={stats.longestStreakDays}
        />
      </CardContent>
    </Card>
  );
});

ProgressCard.displayName = "ProgressCard";
