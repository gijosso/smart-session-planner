import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { cn } from "~/utils/cn";

interface SessionRecapFilterProps {
  filter: "today" | "week";
  onFilterChange: (filter: "today" | "week") => void;
}

interface FilterButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const FilterButton = React.memo<FilterButtonProps>(
  ({ label, selected, onPress }) => {
    return (
      <Pressable
        onPress={onPress}
        className={cn(
          "rounded-full px-6 py-1",
          selected ? "bg-muted" : "bg-transparent",
        )}
      >
        <Text className="text-foreground text-sm font-medium">{label}</Text>
      </Pressable>
    );
  },
);

export const SessionRecapFilter = React.memo<SessionRecapFilterProps>(
  ({ filter, onFilterChange }) => {
    const handleTodayPress = useCallback(() => {
      onFilterChange("today");
    }, [onFilterChange]);

    const handleWeekPress = useCallback(() => {
      onFilterChange("week");
    }, [onFilterChange]);

    return (
      <View className="border-border bg-card flex flex-row items-center gap-2 rounded-full border p-1">
        <FilterButton
          label="Today"
          selected={filter === "today"}
          onPress={handleTodayPress}
        />

        <FilterButton
          label="Week"
          selected={filter === "week"}
          onPress={handleWeekPress}
        />
      </View>
    );
  },
);
