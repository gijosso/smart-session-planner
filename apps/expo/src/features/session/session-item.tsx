import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";

import type { RouterOutputs } from "~/utils/api";

type Session = RouterOutputs["session"]["today"][number];

export const SessionItem = (props: {
  session: Session;
  onToggleComplete: () => void;
}) => {
  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatTimeRange = (start: Date | string, end: Date | string) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  return (
    <View className="bg-muted flex flex-row items-center rounded-lg p-4">
      <Link
        asChild
        href={{
          pathname: "/session/[id]",
          params: { id: props.session.id },
        }}
      >
        <Pressable className="grow">
          <View className="flex flex-row items-center gap-2">
            <Text className="text-foreground text-lg font-semibold">
              {props.session.title}
            </Text>
            {props.session.completed && (
              <Text className="text-primary text-sm">✓</Text>
            )}
          </View>
          <Text className="text-muted-foreground mt-1 text-sm">
            {props.session.type}
          </Text>
          <Text className="text-foreground mt-1 text-sm">
            {formatTimeRange(props.session.startTime, props.session.endTime)}
          </Text>
          {props.session.description && (
            <Text className="text-muted-foreground mt-1 text-sm">
              {props.session.description}
            </Text>
          )}
        </Pressable>
      </Link>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          props.onToggleComplete();
        }}
        className={`rounded-md border px-3 py-2 ${
          props.session.completed
            ? "bg-primary border-primary"
            : "border-input bg-background"
        }`}
      >
        <Text
          className={
            props.session.completed
              ? "text-primary-foreground"
              : "text-foreground"
          }
        >
          {props.session.completed ? "Done" : "Mark Done"}
        </Text>
      </Pressable>
    </View>
  );
};
