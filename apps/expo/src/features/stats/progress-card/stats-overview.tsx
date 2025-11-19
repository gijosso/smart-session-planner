import type React from "react";
import { Text, View } from "react-native";

interface StatsOverviewProps {
  total: number;
  completed: number;
  completionRate: number;
}

/**
 * Overview component displaying the three main statistics:
 * Scheduled, Completed, and Completion Rate
 */
export const StatsOverview: React.FC<StatsOverviewProps> = ({
  total,
  completed,
  completionRate,
}) => {
  return (
    <View className="flex flex-row justify-between">
      <View className="flex-1 items-center justify-center">
        <Text className="text-foreground text-3xl font-bold">{total}</Text>
        <Text className="text-muted-foreground text-sm">Scheduled</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-foreground text-3xl font-bold">{completed}</Text>
        <Text className="text-muted-foreground text-sm">Completed</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-foreground text-3xl font-bold">
          {completionRate}%
        </Text>
        <Text className="text-muted-foreground text-sm">Rate</Text>
      </View>
    </View>
  );
};
