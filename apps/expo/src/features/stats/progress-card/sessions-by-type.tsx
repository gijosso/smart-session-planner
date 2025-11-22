import type React from "react";
import { useMemo } from "react";
import { Text, View } from "react-native";

import type { SessionType } from "@ssp/api/client";

import { SESSION_TYPES_DISPLAY } from "~/constants/session";

interface SessionsByTypeProps {
  byType: Record<SessionType, number>;
}

/**
 * Get the background color class for a session type
 * Classes are written inline so Tailwind can detect them at build time
 */
const getSessionBgClass = (type: SessionType): string => {
  switch (type) {
    case "DEEP_WORK":
      return "bg-session-deep-work-bg";
    case "WORKOUT":
      return "bg-session-workout-bg";
    case "LANGUAGE":
      return "bg-session-language-bg";
    case "MEDITATION":
      return "bg-session-meditation-bg";
    case "CLIENT_MEETING":
      return "bg-session-client-meeting-bg";
    case "STUDY":
      return "bg-session-study-bg";
    case "READING":
      return "bg-session-reading-bg";
    case "OTHER":
      return "bg-session-other-bg";
  }
};

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
        {activeTypes.map(([type, count]) => {
          const bgClass = getSessionBgClass(type);
          return (
            <View
              key={type}
              className={`h-full ${bgClass}`}
              style={{ flex: count }}
            />
          );
        })}
      </View>

      <View className="flex flex-row flex-wrap items-center gap-4">
        {activeTypes.map(([type, count]) => {
          const bgClass = getSessionBgClass(type);
          return (
            <View key={type} className="flex flex-row items-center gap-3">
              <View className={`h-3 w-3 rounded-full ${bgClass}`} />
              <View className="flex flex-row items-center gap-2">
                <Text className="text-foreground text-xl">
                  {SESSION_TYPES_DISPLAY[type].label}
                </Text>
                <View className="bg-muted-foreground h-0.5 w-0.5 rounded-full" />
                <Text className="text-foreground text-xl">{count}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
