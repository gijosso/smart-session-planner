import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS_MUTED } from "~/constants/colors";

interface TimeDisplayProps {
  timeRange: string;
  date?: string;
  iconSize?: number;
  textClassName?: string;
  showSeparator?: boolean;
}

/**
 * Time display component
 * Shows time icon with time range, optionally with date
 * Used in session items, suggestion items, and session detail pages
 */
export const TimeDisplay = React.memo<TimeDisplayProps>(
  ({
    timeRange,
    date,
    iconSize = 22,
    textClassName,
    showSeparator = true,
  }) => {
    return (
      <View className="flex flex-row items-center gap-2">
        <Ionicons
          name="time-outline"
          size={iconSize}
          color={COLORS_MUTED}
          accessibilityLabel="Time icon"
        />

        {date && (
          <>
            <Text className={textClassName ?? "text-secondary-foreground"}>
              {date}
            </Text>
            {showSeparator && (
              <View className="bg-muted-foreground h-1 w-1 rounded-full" />
            )}
          </>
        )}

        <Text className={textClassName ?? "text-secondary-foreground"}>
          {timeRange}
        </Text>
      </View>
    );
  },
);

TimeDisplay.displayName = "TimeDisplay";

