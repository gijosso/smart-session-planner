import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { FilterType } from ".";
import type { RouterOutputs } from "~/utils/api";
import { formatDateShort } from "~/utils/date";

interface SessionRecapDisplayProps {
  sessions: RouterOutputs["session"]["today"][number][];
  filter: FilterType;
}

export const SessionRecapDisplay: React.FC<SessionRecapDisplayProps> = ({
  sessions,
  filter,
}) => {
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.completed).length;

  const getSubtitle = () => {
    if (filter === "today") {
      return "Your schedule today";
    }
    return "Your schedule this week";
  };

  return (
    <View className="flex-1">
      <View className="mb-3">
        <Text className="text-foreground text-xl font-bold">
          {formatDateShort(new Date())}
        </Text>
        <Text className="text-muted-foreground mt-1 text-sm">
          {getSubtitle()}
        </Text>
      </View>

      <View className="bg-background border-border flex flex-row items-center rounded-lg border p-4">
        <View className="flex flex-row items-center">
          <Ionicons name="time-outline" size={20} color="#71717A" />
          <Text className="text-foreground ml-2 text-base font-medium">
            {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
          </Text>
        </View>

        <View className="bg-muted-foreground mx-3 h-1 w-1 rounded-full" />

        <View className="flex flex-row items-center">
          <Ionicons name="checkmark-circle-outline" size={20} color="#71717A" />
          <Text className="text-foreground ml-2 text-base font-medium">
            {completedSessions} done
          </Text>
        </View>
      </View>
    </View>
  );
};
