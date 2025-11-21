import React from "react";
import { View } from "react-native";

import { PRIORITY_LEVELS } from "~/constants/app";

interface PriorityIndicatorProps {
  priority: number;
  className?: string;
}

/**
 * Priority indicator component
 * Displays a visual representation of priority level (1-5) using dots
 * Used in suggestions, session items, and session detail pages
 */
export const PriorityIndicator = React.memo<PriorityIndicatorProps>(
  ({ priority, className }) => {
    return (
      <View
        className={`flex flex-row items-center gap-1 ${className ?? ""}`}
        accessibilityLabel={`Priority level ${priority} out of ${PRIORITY_LEVELS.length}`}
        accessibilityRole="image"
      >
        {PRIORITY_LEVELS.map((level) => (
          <View
            key={level}
            className={`h-2 w-2 rounded-full ${
              level <= priority ? "bg-black" : "bg-gray-300"
            }`}
            accessibilityLabel={
              level <= priority ? "Active priority" : "Inactive priority"
            }
          />
        ))}
      </View>
    );
  },
);

PriorityIndicator.displayName = "PriorityIndicator";

