import type React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { RouterOutputs } from "~/utils/api";
import { Card, CardContent, CardHeader } from "~/components";
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
 */
export const ProgressCard: React.FC<ProgressCardProps> = ({ stats }) => {
  if (!stats || stats.total === 0) {
    return null;
  }

  return (
    <Card variant="muted" className="bg-progress-card">
      <CardHeader>
        <View className="flex flex-row items-center gap-2">
          <Ionicons name="disc-outline" size={22} />
          <Text className="text-foreground text-lg font-semibold">
            Your Progress
          </Text>
        </View>
      </CardHeader>

      <CardContent>
        <StatsOverview
          total={stats.total}
          completed={stats.completed}
          completionRate={stats.completionRate}
        />

        <SessionsByType byType={stats.byType} />

        <AverageSpacing averageSpacingHours={stats.averageSpacingHours} />

        <Streaks
          currentStreakDays={stats.currentStreakDays}
          longestStreakDays={stats.longestStreakDays}
        />
      </CardContent>
    </Card>
  );
};
