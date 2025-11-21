import React from "react";
import { View } from "react-native";

interface ItemSeparatorProps {
  horizontal?: boolean;
  size?: "sm" | "md" | "lg";
}

export const SEPARATOR_SIZE = { sm: 16, md: 24, lg: 32 } as const;

/**
 * Shared item separator component for lists
 * Supports both horizontal and vertical layouts with different sizes
 * Uses pixel values for spacing.
 */
export const ItemSeparator = React.memo<ItemSeparatorProps>(
  ({ horizontal = false, size = "md" }) => {
    const dimensionStyle = horizontal
      ? { width: SEPARATOR_SIZE[size], height: 0 }
      : { height: SEPARATOR_SIZE[size], width: 0 };

    return <View style={dimensionStyle} />;
  },
);
ItemSeparator.displayName = "ItemSeparator";
