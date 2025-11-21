import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS_DESTRUCTIVE } from "~/constants/colors";

/**
 * Error icon component
 * Displays a visual indicator for errors
 */
export const ErrorIcon = React.memo(() => {
  return (
    <View
      className="mb-6"
      accessibilityRole="image"
      accessibilityLabel="Error icon"
    >
      <Ionicons
        name="alert-circle-outline"
        size={64}
        color={COLORS_DESTRUCTIVE}
      />
    </View>
  );
});

ErrorIcon.displayName = "ErrorIcon";

