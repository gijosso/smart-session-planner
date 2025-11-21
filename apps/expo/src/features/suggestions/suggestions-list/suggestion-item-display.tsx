import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { SuggestionWithId } from "~/types";
import { CardContent, CardHeader, CardTitle } from "~/components";
import { PRIORITY_LEVELS } from "~/constants/app";
import { COLORS_MUTED } from "~/constants/colors";
import {
  formatDateDisplay,
  formatTimeRange,
} from "~/utils/suggestions/suggestion-formatting";

interface SuggestionItemDisplayProps {
  suggestion: SuggestionWithId;
}

/**
 * Display component for suggestion item
 * Renders the visual representation of a suggestion (title, priority, date/time, reasons)
 */
export const SuggestionItemDisplay = React.memo<SuggestionItemDisplayProps>(
  ({ suggestion }) => {
    // Memoize formatted date/time strings
    const formattedDate = useMemo(
      () => formatDateDisplay(suggestion.startTime),
      [suggestion.startTime],
    );

    const formattedTimeRange = useMemo(
      () => formatTimeRange(suggestion.startTime, suggestion.endTime),
      [suggestion.startTime, suggestion.endTime],
    );

    const reasonsText = useMemo(
      () => suggestion.reasons.join(". "),
      [suggestion.reasons],
    );

    return (
      <>
        <CardHeader>
          <View className="flex flex-1 flex-row items-center justify-end">
            <View
              className="flex flex-row items-center gap-1"
              accessibilityLabel={`Priority level ${suggestion.priority} out of ${PRIORITY_LEVELS.length}`}
              accessibilityRole="image"
            >
              {PRIORITY_LEVELS.map((level) => (
                <View
                  key={level}
                  className={`h-2 w-2 rounded-full ${
                    level <= suggestion.priority ? "bg-black" : "bg-gray-300"
                  }`}
                  accessibilityLabel={
                    level <= suggestion.priority
                      ? "Active priority"
                      : "Inactive priority"
                  }
                />
              ))}
            </View>
          </View>
          <CardTitle>{suggestion.title}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col justify-center gap-4">
          <View className="flex flex-row items-center gap-2">
            <Ionicons
              name="time-outline"
              size={22}
              color={COLORS_MUTED}
              accessibilityLabel="Time icon"
            />

            <Text className="text-secondary-foreground">{formattedDate}</Text>

            <View className="bg-muted-foreground h-1 w-1 rounded-full" />

            <Text className="text-secondary-foreground">
              {formattedTimeRange}
            </Text>
          </View>

          {suggestion.reasons.length > 0 && (
            <Text className="text-secondary-foreground" numberOfLines={3}>
              {reasonsText}.
            </Text>
          )}
        </CardContent>
      </>
    );
  },
);

SuggestionItemDisplay.displayName = "SuggestionItemDisplay";
