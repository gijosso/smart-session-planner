import type React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components";
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
}

/**
 * Individual suggestion item component
 * Displays a single suggestion in a horizontal scrolling list
 */
export const SuggestionItem: React.FC<SuggestionItemProps> = ({
  suggestion,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Create session mutation
  const createSessionMutation = useMutation(
    trpc.session.create.mutationOptions({
      onSuccess: () => {
        // Invalidate relevant queries
        void queryClient.invalidateQueries(trpc.session.all.queryFilter());
        void queryClient.invalidateQueries(trpc.session.today.queryFilter());
        void queryClient.invalidateQueries(trpc.session.upcoming.queryFilter());
        void queryClient.invalidateQueries(trpc.stats.sessions.queryFilter());
      },
    }),
  );

  const handleAccept = () => {
    createSessionMutation.mutate({
      title: "Smart Suggestion",
      type: "DEEP_WORK",
      startTime: suggestion.startTime,
      endTime: suggestion.endTime,
      priority: 3,
      allowConflicts: false,
    });
  };

  const handleAdjust = () => {
    router.push({
      pathname: "/session/create",
      params: {
        suggestedStartTime: suggestion.startTime.toISOString(),
        suggestedEndTime: suggestion.endTime.toISOString(),
      },
    });
  };

  return (
    <Card variant="muted">
      <CardHeader>
        <CardTitle>FIXME</CardTitle>
      </CardHeader>

      <CardContent>
        <View style={{ width: 300 }}>
          <View className="mb-3 flex flex-row items-center gap-2">
            <Text className="text-muted-foreground text-sm">
              <Ionicons name="time-outline" size={22} color="#71717A" />
            </Text>
            <Text className="text-foreground text-sm">
              {formatDateDisplay(suggestion.startTime)} ·{" "}
              {formatTimeRange(suggestion.startTime, suggestion.endTime)}
            </Text>
          </View>

          {suggestion.reasons.length > 0 && (
            <View className="mb-4">
              <Text className="text-muted-foreground text-sm leading-5">
                {suggestion.reasons.join(". ")}.
              </Text>
            </View>
          )}
        </View>
      </CardContent>
      <CardFooter>
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
          className="border-foreground/20 bg-background rounded-lg border px-4 py-2"
        >
          <Text className="text-foreground text-center text-sm font-semibold">
            Adjust
          </Text>
        </Pressable>
      </CardFooter>
    </Card>
  );
};
