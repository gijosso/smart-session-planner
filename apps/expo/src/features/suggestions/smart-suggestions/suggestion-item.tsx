import React, { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SuggestionWithId } from "~/types";
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
  suggestion: SuggestionWithId;
}

const CARD_CONTENT_STYLE = { width: 300 };

/**
 * Individual suggestion item component
 * Displays a single suggestion in a horizontal scrolling list
 */
export const SuggestionItem = React.memo<SuggestionItemProps>(
  ({ suggestion }) => {
    const router = useRouter();
    const queryClient = useQueryClient();

    // Create session mutation
    const createSessionMutation = useMutation(
      trpc.session.create.mutationOptions({
        onSuccess: () => {
          // Invalidate relevant queries
          void queryClient.invalidateQueries(trpc.session.all.queryFilter());
          void queryClient.invalidateQueries(trpc.session.today.queryFilter());
          void queryClient.invalidateQueries(
            trpc.session.upcoming.queryFilter(),
          );
          void queryClient.invalidateQueries(trpc.stats.sessions.queryFilter());
        },
      }),
    );

    const handleAccept = useCallback(() => {
      createSessionMutation.mutate({
        title: suggestion.title,
        type: suggestion.type,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        priority: suggestion.priority,
        description: suggestion.description,
        fromSuggestionId: suggestion.id,
        allowConflicts: false,
      });
    }, [
      suggestion.id,
      suggestion.title,
      suggestion.type,
      suggestion.startTime,
      suggestion.endTime,
      suggestion.priority,
      suggestion.description,
      createSessionMutation,
    ]);

    const handleAdjust = useCallback(() => {
      router.push({
        pathname: "/session/create",
        params: {
          title: suggestion.title,
          type: suggestion.type,
          suggestedStartTime: suggestion.startTime.toISOString(),
          suggestedEndTime: suggestion.endTime.toISOString(),
          priority: suggestion.priority.toString(),
          suggestionId: suggestion.id,
          ...(suggestion.description && {
            description: suggestion.description,
          }),
        },
      });
    }, [
      suggestion.id,
      suggestion.title,
      suggestion.type,
      suggestion.startTime,
      suggestion.endTime,
      suggestion.priority,
      suggestion.description,
      router,
    ]);

    // Memoize formatted date/time strings
    const formattedDate = useMemo(
      () => formatDateDisplay(suggestion.startTime),
      [suggestion.startTime],
    );

    const formattedTimeRange = useMemo(
      () => formatTimeRange(suggestion.startTime, suggestion.endTime),
      [suggestion.startTime, suggestion.endTime],
    );

    const reasonsText = useMemo(
      () => suggestion.reasons.join(". "),
      [suggestion.reasons],
    );

    return (
      <Card variant="muted">
        <CardHeader>
          <CardTitle>{suggestion.title}</CardTitle>
        </CardHeader>

        <CardContent>
          <View style={CARD_CONTENT_STYLE}>
            <View className="mb-3 flex flex-row items-center gap-2">
              <Text className="text-muted-foreground text-sm">
                <Ionicons name="time-outline" size={22} color="#71717A" />
              </Text>
              <Text className="text-foreground text-sm">
                {formattedDate} · {formattedTimeRange}
              </Text>
            </View>

            {suggestion.reasons.length > 0 && (
              <View className="mb-4">
                <Text className="text-muted-foreground text-sm leading-5">
                  {reasonsText}.
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
  },
);
