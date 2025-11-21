import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { SessionType } from "@ssp/api/client";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";

interface SessionTypeIconProps {
  type: SessionType;
  size?: number;
  iconSize?: number;
  className?: string;
  accessibilityLabel?: string;
}

/**
 * Session type icon component
 * Displays the icon for a session type with colored background
 * Used in session items and session detail pages
 */
export const SessionTypeIcon = React.memo<SessionTypeIconProps>(
  ({
    type,
    size = 22,
    iconSize = 22,
    className,
    accessibilityLabel,
  }) => {
    const sessionTypeDisplay = SESSION_TYPES_DISPLAY[type];
    const label =
      accessibilityLabel ?? `${sessionTypeDisplay.label} icon`;

    return (
      <View
        key={`session-type-icon-${type}-${size}-${iconSize}-${className ?? ""}`}
        className={`bg-muted rounded-xl p-3 ${className ?? ""}`}
        accessibilityRole="image"
        accessibilityLabel={label}
      >
        <Ionicons
          name={sessionTypeDisplay.icon}
          size={iconSize}
          color={sessionTypeDisplay.iconColor}
          accessibilityLabel={label}
        />
      </View>
    );
  },
);

SessionTypeIcon.displayName = "SessionTypeIcon";

