import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { RouterOutputs } from "~/utils/api";
import { Card, CardContent } from "~/components";
import { COLORS_MUTED } from "~/constants/colors";

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
        <CardContent accessibilityRole="summary">
          <View className="flex flex-row items-center">
            <Ionicons
              name="time-outline"
              size={22}
              color={COLORS_MUTED}
              accessibilityLabel="Total sessions icon"
            />
            <Text className="text-muted ml-2.5" accessibilityRole="text">
              {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
            </Text>
          </View>

          <View className="bg-border h-1 w-1 rounded-full" accessibilityRole="none" />

          <View className="flex flex-row items-center">
            <Ionicons
              name="checkmark"
              size={22}
              color={COLORS_MUTED}
              accessibilityLabel="Completed sessions icon"
            />
            <Text className="text-muted-foreground ml-2.5 text-base font-semibold" accessibilityRole="text">
              {completedSessions} done
            </Text>
          </View>
        </CardContent>
      </Card>
    );
  },
);
