import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { RouterOutputs } from "~/utils/api";
import { Card, CardContent } from "~/components";
import { COLORS_MUTED } from "~/constants/colors";
import { formatDateShort } from "~/utils/date";
import { SessionRecapFilter } from "./session-recap-filter";

export type FilterType = "today" | "week";
const FILTER_DISPLAY: Record<FilterType, string> = {
  today: "Your schedule today",
  week: "Your schedule this week",
};

type SessionStats = RouterOutputs["stats"]["sessions"];

interface SessionRecapProps {
  stats?: SessionStats;
}

export const SessionRecap: React.FC<SessionRecapProps> = ({ stats }) => {
  const [filter, setFilter] = useState<FilterType>("today");
  const today = useMemo(() => formatDateShort(new Date()), []);

  const { totalSessions, completedSessions } = useMemo(() => {
    if (!stats) {
      return { totalSessions: 0, completedSessions: 0 };
    }
    const periodStats = filter === "today" ? stats.today : stats.week;
    return {
      totalSessions: periodStats.total,
      completedSessions: periodStats.completed,
    };
  }, [stats, filter]);

  return (
    <View className="flex flex-col gap-2">
      <View className="mb-4 flex flex-row items-center justify-between">
        <View className="flex flex-col gap-2">
          <Text className="text-foreground text-2xl">{today}</Text>
          <Text className="text-muted-foreground text-md">
            {FILTER_DISPLAY[filter]}
          </Text>
        </View>
        <SessionRecapFilter filter={filter} onFilterChange={setFilter} />
      </View>

      <Card className="flex flex-row items-center">
        <CardContent accessibilityRole="summary">
          <View className="flex flex-row items-center">
            <View className="flex flex-row items-center gap-2">
              <Ionicons
                name="time-outline"
                size={22}
                color={COLORS_MUTED}
                accessibilityLabel="Total sessions icon"
              />
              <Text className="text-foreground text-md" accessibilityRole="text">
                {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
              </Text>
            </View>

            <View className="bg-muted mx-4 h-1 w-1 rounded-full" accessibilityRole="none" />

            <View className="flex flex-row items-center gap-2">
              <Ionicons
                name="checkmark"
                size={22}
                color={COLORS_MUTED}
                accessibilityLabel="Completed sessions icon"
              />
              <Text className="text-foreground text-md" accessibilityRole="text">
                {completedSessions} done
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </View>
  );
};
