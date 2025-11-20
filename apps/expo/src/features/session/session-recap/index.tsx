import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { RouterOutputs } from "~/utils/api";
import { Card } from "~/components";
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
    <View className="flex flex-col">
      <View className="mb-4 flex flex-row items-start justify-between">
        <View>
          <Text className="text-foreground text-2xl font-bold">{today}</Text>
          <Text className="text-muted-foreground mt-1 text-sm">
            {FILTER_DISPLAY[filter]}
          </Text>
        </View>
        <SessionRecapFilter filter={filter} onFilterChange={setFilter} />
      </View>
      <Card className="flex flex-row items-center">
        <View className="flex flex-row items-center">
          <Ionicons name="time-outline" size={22} color="#71717A" />
          <Text className="text-foreground ml-2.5 text-base font-semibold">
            {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
          </Text>
        </View>

        <View className="bg-muted-foreground mx-4 h-1 w-1 rounded-full" />

        <View className="flex flex-row items-center">
          <Ionicons name="checkmark" size={22} color="#71717A" />
          <Text className="text-foreground ml-2.5 text-base font-semibold">
            {completedSessions} done
          </Text>
        </View>
      </Card>
    </View>
  );
};
