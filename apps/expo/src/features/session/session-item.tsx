import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";

import type { RouterOutputs } from "~/utils/api";
import { Card } from "~/components";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { formatTimeRange } from "~/utils/date";

interface SessionItemProps {
  session: RouterOutputs["session"]["today"][number];
  onToggleComplete: () => void;
}

export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  onToggleComplete,
}) => {
  return (
    <Card variant="outline">
      <Link
        asChild
        href={{
          pathname: "/session/[id]",
          params: { id: session.id },
        }}
      >
        <Pressable className="grow">
          <View className="flex flex-row items-center gap-2">
            <Text className="text-foreground text-lg font-semibold">
              {session.title}
            </Text>
            {session.completed && (
              <Text className="text-primary text-sm">✓</Text>
            )}
          </View>
          <Text className="text-muted-foreground mt-1 text-sm">
            {SESSION_TYPES_DISPLAY[session.type].label}
          </Text>
          <Text className="text-foreground mt-1 text-sm">
            {formatTimeRange(session.startTime, session.endTime)}
          </Text>
          {session.description && (
            <Text className="text-muted-foreground mt-1 text-sm">
              {session.description}
            </Text>
          )}
        </Pressable>
      </Link>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        className={`rounded-md border px-3 py-2 ${
          session.completed
            ? "bg-primary border-primary"
            : "border-input bg-background"
        }`}
      >
        <Text
          className={
            session.completed ? "text-primary-foreground" : "text-foreground"
          }
        >
          {session.completed ? "Done" : "Mark Done"}
        </Text>
      </Pressable>
    </Card>
  );
};
