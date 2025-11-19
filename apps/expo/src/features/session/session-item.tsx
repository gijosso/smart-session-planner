import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { RouterOutputs } from "~/utils/api";
import { Card } from "~/components";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { formatTimeRange } from "~/utils/date";

interface SessionItemProps {
  session: RouterOutputs["session"]["today"][number];
}

export const SessionItem: React.FC<SessionItemProps> = ({ session }) => {
  return (
    <Link
      asChild
      href={{
        pathname: "/session/[id]",
        params: { id: session.id },
      }}
    >
      <Pressable className="grow">
        <Card variant="outline" className="flex flex-row items-center gap-4">
          <View className="bg-muted rounded-lg p-2">
            <Ionicons
              name={SESSION_TYPES_DISPLAY[session.type].icon}
              size={22}
              color={SESSION_TYPES_DISPLAY[session.type].iconColor}
            />
          </View>

          <View className="flex flex-1 flex-col">
            <Text className="text-foreground text-lg font-semibold">
              {SESSION_TYPES_DISPLAY[session.type].label}
            </Text>
            <Text className="text-muted-foreground mt-1 text-sm">
              {formatTimeRange(session.startTime, session.endTime)}
            </Text>
          </View>

          {session.completed && (
            <View className="bg-foreground items-center justify-center rounded-full p-1">
              <Ionicons name="checkmark-outline" size={12} color="white" />
            </View>
          )}
        </Card>
      </Pressable>
    </Link>
  );
};
