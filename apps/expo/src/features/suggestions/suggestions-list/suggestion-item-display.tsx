import React, { useMemo } from "react";
import { Text, View } from "react-native";

import type { SuggestionWithId } from "~/types";
import {
  CardContent,
  CardHeader,
  CardTitle,
  PriorityIndicator,
  TimeDisplay,
} from "~/components";
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
            <PriorityIndicator priority={suggestion.priority} />
          </View>
          <CardTitle>{suggestion.title}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col justify-center gap-4">
          <TimeDisplay
            timeRange={formattedTimeRange}
            date={formattedDate}
            showSeparator={true}
          />

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
