import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { SessionType } from "@ssp/api/client";

import { SESSION_TYPES_DISPLAY } from "~/constants/session";

interface SessionTypeIconProps {
  type: SessionType;
  iconSize?: number;
  accessibilityLabel?: string;
}

/**
 * Session type icon component
 * Displays the icon for a session type with colored background
 * Used in session items and session detail pages
 */
export const SessionTypeIcon = React.memo<SessionTypeIconProps>(
  ({ type, iconSize = 22, accessibilityLabel }) => {
    const sessionTypeDisplay = SESSION_TYPES_DISPLAY[type];
    const label = accessibilityLabel ?? `${sessionTypeDisplay.label} icon`;

    return (
      <View
        key={`session-type-icon-${type}`}
        accessibilityRole="image"
        accessibilityLabel={label}
        style={{
          borderRadius: 14,
          padding: 12,
          backgroundColor: sessionTypeDisplay.backgroundColor,
        }}
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
