import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS_BACKGROUND_LIGHT } from "~/constants/colors";

interface CompletedIndicatorProps {
  size?: number;
  iconSize?: number;
  className?: string;
}

/**
 * Completed indicator component
 * Displays a checkmark badge indicating completion status
 * Used in session items
 */
export const CompletedIndicator = React.memo<CompletedIndicatorProps>(
  ({ size = 14, iconSize = 14, className }) => {
    return (
      <View
        key={`completed-${size}-${iconSize}-${className ?? ""}`}
        className={`bg-foreground items-center justify-center rounded-full p-1 ${className ?? ""}`}
        accessibilityRole="image"
        accessibilityLabel="Completed indicator"
      >
        <Ionicons
          name="checkmark-outline"
          size={iconSize}
          color={COLORS_BACKGROUND_LIGHT}
          accessibilityLabel="Checkmark icon"
        />
      </View>
    );
  },
);

CompletedIndicator.displayName = "CompletedIndicator";

