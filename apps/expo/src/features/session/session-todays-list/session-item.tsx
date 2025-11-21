import { memo, useMemo } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";

import type { RouterOutputs } from "~/utils/api";
import {
  Button,
  Card,
  CompletedIndicator,
  SessionTypeIcon,
  TimeDisplay,
} from "~/components";
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
          <SessionTypeIcon type={session.type} iconSize={22} />

          <View className="flex flex-1 flex-col gap-2">
            <Text className="text-foreground text-xl" accessibilityRole="text">
              {sessionTypeLabel}
            </Text>
            <TimeDisplay timeRange={timeRange} iconSize={18} />
          </View>

          {session.completed && <CompletedIndicator />}
        </Card>
      </Button>
    </Link>
  );
});

SessionItem.displayName = "SessionItem";
