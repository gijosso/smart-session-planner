import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

interface SessionRecapFilterProps {
  filter: "today" | "week";
  onFilterChange: (filter: "today" | "week") => void;
}

export const SessionRecapFilter = React.memo<SessionRecapFilterProps>(
  ({ filter, onFilterChange }) => {
    const handleTodayPress = useCallback(() => {
      onFilterChange("today");
    }, [onFilterChange]);

    const handleWeekPress = useCallback(() => {
      onFilterChange("week");
    }, [onFilterChange]);

    return (
      <View className="border-border flex flex-row items-center gap-2 rounded-full border p-1">
        <Pressable
          onPress={handleTodayPress}
          className={`rounded-full px-4 py-2 ${
            filter === "today" ? "bg-muted" : "bg-background"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              filter === "today" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Today
          </Text>
        </Pressable>
        <Pressable
          onPress={handleWeekPress}
          className={`rounded-full px-4 py-2 ${
            filter === "week" ? "bg-muted" : "bg-background"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              filter === "week" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Week
          </Text>
        </Pressable>
      </View>
    );
  },
);
