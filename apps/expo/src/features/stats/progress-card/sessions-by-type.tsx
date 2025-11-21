import type React from "react";
import { useMemo } from "react";
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
  const activeTypes = useMemo(
    () =>
      (Object.entries(byType) as [SessionType, number][])
    .filter(([_, count]) => count > 0)
        .sort(([_, a], [__, b]) => b - a), // Sort by count descending
    [byType],
  );

  if (activeTypes.length === 0) {
    return null;
  }

  return (
    <View className="gap-4">
      <Text className="text-secondary-foreground text-md">
        Sessions by type
      </Text>

      <View className="h-2 flex-row gap-2 overflow-hidden rounded-full">
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

      <View className="flex flex-row flex-wrap items-center gap-4">
        {activeTypes.map(([type, count]) => (
          <View key={type} className="flex flex-row items-center gap-3">
            <View className="bg-muted-foreground h-3 w-3 rounded-full" />
            <View className="flex flex-row items-center gap-2">
              <Text className="text-foreground text-xl">
                {SESSION_TYPES_DISPLAY[type].label}
              </Text>
              <View className="bg-muted-foreground h-0.5 w-0.5 rounded-full" />
              <Text className="text-foreground text-xl">{count}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
