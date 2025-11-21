import type React from "react";
import { Text, View } from "react-native";

interface StatBlockProps {
  value: React.ReactNode;
  label: string;
}

const StatBlock: React.FC<StatBlockProps> = ({ value, label }) => (
  <View className="flex-1 items-center justify-center gap-2">
    <Text className="text-foreground text-4xl">{value}</Text>
    <Text className="text-foreground">{label}</Text>
  </View>
);

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
      <StatBlock value={total} label="Scheduled" />
      <StatBlock value={completed} label="Completed" />
      <StatBlock value={`${completionRate}%`} label="Rate" />
    </View>
  );
};
