import type React from "react";
import { Text, View } from "react-native";

import type { SessionType } from "@ssp/api/client";

import { SESSION_TYPES_DISPLAY } from "~/constants/session";

interface SessionsByTypeProps {
  byType: Record<SessionType, number>;
}

/**
 * Component displaying session breakdown by type with progress bar and legend
 */
export const SessionsByType: React.FC<SessionsByTypeProps> = ({ byType }) => {
  const activeTypes = (Object.entries(byType) as [SessionType, number][])
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a); // Sort by count descending

  if (activeTypes.length === 0) {
    return null;
  }

  return (
    <View>
      <Text className="text-foreground mb-3 text-base font-semibold">
        Sessions by type
      </Text>

      <View className="bg-background mb-3 h-2 flex-row gap-2 overflow-hidden rounded-full">
        {activeTypes.map(([type, count]) => (
          <View
            key={type}
            style={{
              flex: count,
              backgroundColor: SESSION_TYPES_DISPLAY[type].color,
            }}
          />
        ))}
      </View>

      <View className="flex flex-row items-center gap-4">
        {activeTypes.map(([type, count]) => (
          <View key={type} className="flex flex-row items-center">
            <View className="bg-muted-foreground h-1 w-1 rounded-full" />

            <Text className="text-foreground ml-2 text-sm">
              {SESSION_TYPES_DISPLAY[type].label} · {count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
