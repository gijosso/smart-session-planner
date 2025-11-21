import { memo, useMemo } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { RouterOutputs } from "~/utils/api";
import { Button, Card } from "~/components";
import { COLORS_BACKGROUND_LIGHT, COLORS_MUTED } from "~/constants/colors";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { formatTimeRange } from "~/utils/date";

interface SessionItemProps {
  session: RouterOutputs["session"]["today"][number];
}

export const SESSION_ITEM_HEIGHT = 95 as const;

export const SessionItem = memo<SessionItemProps>(({ session }) => {
  const sessionTypeLabel = SESSION_TYPES_DISPLAY[session.type].label;
  const timeRange = useMemo(
    () => formatTimeRange(session.startTime, session.endTime),
    [session.startTime, session.endTime],
  );
  const accessibilityLabel = useMemo(
    () =>
      `${sessionTypeLabel} session from ${timeRange}${session.completed ? ", completed" : ""}`,
    [sessionTypeLabel, timeRange, session.completed],
  );

  return (
    <Link
      asChild
      href={{
        pathname: "/session/[id]",
        params: { id: session.id },
      }}
      style={{ height: SESSION_ITEM_HEIGHT }}
    >
      <Button
        variant="ghost"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <Card className="flex flex-row items-center gap-4">
          <View className="bg-muted rounded-xl p-3" accessibilityRole="image">
            <Ionicons
              name={SESSION_TYPES_DISPLAY[session.type].icon}
              size={22}
              color={SESSION_TYPES_DISPLAY[session.type].iconColor}
              accessibilityLabel={`${sessionTypeLabel} icon`}
            />
          </View>

          <View className="flex flex-1 flex-col gap-2">
            <Text className="text-foreground text-xl" accessibilityRole="text">
              {sessionTypeLabel}
            </Text>
            <View className="flex flex-row items-center gap-2">
              <Ionicons
                name="time-outline"
                size={18}
                color={COLORS_MUTED}
                accessibilityLabel="Time icon"
              />
              <Text className="text-muted-foreground text-md" accessibilityRole="text">
                {timeRange}
              </Text>
            </View>
          </View>

          {session.completed && (
            <View
              className="bg-foreground items-center justify-center rounded-full p-1"
              accessibilityRole="image"
              accessibilityLabel="Completed indicator"
            >
              <Ionicons
                name="checkmark-outline"
                size={14}
                color={COLORS_BACKGROUND_LIGHT}
                accessibilityLabel="Checkmark icon"
              />
            </View>
          )}
        </Card>
      </Button>
    </Link>
  );
});

SessionItem.displayName = "SessionItem";
