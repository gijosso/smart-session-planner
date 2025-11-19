import type React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { trpc } from "~/utils/api";
import {
  formatDateDisplay,
  formatTimeRange,
} from "~/utils/suggestion-formatting";

interface SuggestionItemProps {
  suggestion: {
    id: string;
    startTime: Date;
    endTime: Date;
    score: number;
    reasons: string[];
  };
  sessionType: SessionType;
  durationMinutes: number;
  priority: number;
  onAccepted?: () => void;
  cardWidth?: number;
}

/**
 * Individual suggestion item component
 * Displays a single suggestion in a horizontal scrolling list
 */
export const SuggestionItem: React.FC<SuggestionItemProps> = ({
  suggestion,
  sessionType,
  durationMinutes,
  priority,
  onAccepted,
  cardWidth = 320,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const sessionTypeDisplay = SESSION_TYPES_DISPLAY[sessionType];
  const cardColor = sessionTypeDisplay.color;

  // Create session mutation
  const createSessionMutation = useMutation(
    trpc.session.create.mutationOptions({
      onSuccess: () => {
        // Invalidate relevant queries
        void queryClient.invalidateQueries(trpc.session.all.queryFilter());
        void queryClient.invalidateQueries(trpc.session.today.queryFilter());
        void queryClient.invalidateQueries(trpc.session.upcoming.queryFilter());
        void queryClient.invalidateQueries(trpc.stats.sessions.queryFilter());
        // Call onAccepted callback to remove this suggestion from the list
        onAccepted?.();
      },
    }),
  );

  const handleAccept = () => {
    createSessionMutation.mutate({
      title: sessionTypeDisplay.label,
      type: sessionType,
      startTime: suggestion.startTime,
      endTime: suggestion.endTime,
      priority,
      allowConflicts: false,
    });
  };

  const handleAdjust = () => {
    router.push({
      pathname: "/session/create",
      params: {
        type: sessionType,
        durationMinutes: durationMinutes.toString(),
        priority: priority.toString(),
        suggestedStartTime: suggestion.startTime.toISOString(),
        suggestedEndTime: suggestion.endTime.toISOString(),
      },
    });
  };

  return (
    <View
      className="mr-4 rounded-xl p-5"
      style={{
        width: cardWidth,
        backgroundColor: `${cardColor}15`,
      }}
    >
      {/* Title */}
      <View className="mb-4">
        <Text className="text-2xl font-bold" style={{ color: cardColor }}>
          {sessionTypeDisplay.label}
        </Text>
      </View>

      {/* Time Slot */}
      <View className="mb-3 flex flex-row items-center gap-2">
        <Text className="text-muted-foreground text-sm">🕐</Text>
        <Text className="text-foreground text-sm">
          {formatDateDisplay(suggestion.startTime)} ·{" "}
          {formatTimeRange(suggestion.startTime, suggestion.endTime)}
        </Text>
      </View>

      {/* Rationale */}
      {suggestion.reasons.length > 0 && (
        <View className="mb-4">
          <Text className="text-muted-foreground text-sm leading-5">
            {suggestion.reasons.join(". ")}.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View className="flex flex-row gap-3">
        <Pressable
          onPress={handleAccept}
          disabled={createSessionMutation.isPending}
          className="bg-foreground flex-1 rounded-lg px-4 py-3"
        >
          <Text className="text-background text-center text-sm font-semibold">
            {createSessionMutation.isPending ? "Accepting..." : "Accept"}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleAdjust}
          className="border-foreground/20 bg-background flex-1 rounded-lg border px-4 py-3"
        >
          <Text className="text-foreground text-center text-sm font-semibold">
            Adjust
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
