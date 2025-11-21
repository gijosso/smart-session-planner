import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { RouterOutputs } from "~/utils/api";
import { Card, CardContent } from "~/components";

interface SessionRecapCardProps {
  sessions: RouterOutputs["session"]["today"][number][];
}

export const SessionRecapCard = React.memo<SessionRecapCardProps>(
  ({ sessions }) => {
    const { totalSessions, completedSessions } = useMemo(() => {
      const total = sessions.length;
      const completed = sessions.filter((s) => s.completed).length;
      return { totalSessions: total, completedSessions: completed };
    }, [sessions]);

    return (
      <Card variant="outline" className="flex flex-row items-center">
        <CardContent>
          <View className="flex flex-row items-center">
            <Ionicons name="time-outline" size={22} color="#71717A" />
            <Text className="text-muted ml-2.5">
              {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
            </Text>
          </View>

          <View className="bg-muted-foreground mx-4 h-1 w-1 rounded-full" />

          <View className="flex flex-row items-center">
            <Ionicons name="checkmark" size={22} color="#71717A" />
            <Text className="text-muted-foreground ml-2.5 text-base font-semibold">
              {completedSessions} done
            </Text>
          </View>
        </CardContent>
      </Card>
    );
  },
);
