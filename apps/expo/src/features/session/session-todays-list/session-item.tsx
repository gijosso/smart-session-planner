import { Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { RouterOutputs } from "~/utils/api";
import { Button, Card } from "~/components";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { formatTimeRange } from "~/utils/date";

interface SessionItemProps {
  session: RouterOutputs["session"]["today"][number];
}

export const SESSION_ITEM_HEIGHT = 95 as const;

export const SessionItem: React.FC<SessionItemProps> = ({ session }) => {
  return (
    <Link
      asChild
      href={{
        pathname: "/session/[id]",
        params: { id: session.id },
      }}
      style={{ height: SESSION_ITEM_HEIGHT }}
    >
      <Button variant="ghost">
        <Card className="flex flex-row items-center gap-4">
          <View className="bg-muted rounded-xl p-3">
            <Ionicons
              name={SESSION_TYPES_DISPLAY[session.type].icon}
              size={22}
              color={SESSION_TYPES_DISPLAY[session.type].iconColor}
            />
          </View>

          <View className="flex flex-1 flex-col gap-2">
            <Text className="text-foreground text-xl">
              {SESSION_TYPES_DISPLAY[session.type].label}
            </Text>
            <View className="flex flex-row items-center gap-2">
              <Ionicons name="time-outline" size={18} color="#71717A" />
              <Text className="text-muted-foreground text-md">
                {formatTimeRange(session.startTime, session.endTime)}
              </Text>
            </View>
          </View>

          {session.completed && (
            <View className="bg-foreground items-center justify-center rounded-full p-1">
              <Ionicons name="checkmark-outline" size={14} color="white" />
            </View>
          )}
        </Card>
      </Button>
    </Link>
  );
};
