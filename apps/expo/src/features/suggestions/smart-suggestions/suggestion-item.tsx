import React, { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SuggestionWithId } from "~/types";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components";
import { trpc } from "~/utils/api";
import { invalidateSessionQueries } from "~/utils/session-cache";
import {
  formatDateDisplay,
  formatTimeRange,
} from "~/utils/suggestion-formatting";
import { getSuggestionMutationOptions } from "~/utils/suggestion-id";

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

    // Create session mutation with React Query-native optimistic updates
    const createSessionMutation = useMutation(
      trpc.session.create.mutationOptions({
        ...getSuggestionMutationOptions(queryClient, { lookAheadDays: 14 }),
        onSuccess: (data) => {
          // Invalidate queries based on session date (granular invalidation)
          invalidateSessionQueries(queryClient, {
            startTime: data.startTime,
            id: data.id,
          });
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
      <Card variant="muted" className="bg-suggestion-card p-6">
        <CardHeader>
          <View className="flex flex-1 flex-row items-center justify-end">
            <View className="flex flex-row items-center gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <View
                  key={level}
                  className={`h-2 w-2 rounded-full bg-black ${
                    level <= suggestion.priority ? "bg-black" : "bg-gray-300"
                  }`}
                />
              ))}
            </View>
          </View>
          <CardTitle>{suggestion.title}</CardTitle>
        </CardHeader>

        <CardContent>
          <View style={CARD_CONTENT_STYLE}>
            <View className="flex flex-row items-center gap-2">
              <Ionicons name="time-outline" size={22} color="#71717A" />

              <Text className="text-secondary-foreground">{formattedDate}</Text>

              <View className="bg-muted-foreground h-1 w-1 rounded-full" />

              <Text className="text-secondary-foreground">
                {formattedTimeRange}
              </Text>
            </View>
          </View>
        </CardContent>

        {suggestion.reasons.length > 0 && (
          <Text className="text-secondary-foreground">{reasonsText}.</Text>
        )}

        <CardFooter>
          <Button
            size="lg"
            onPress={handleAccept}
            disabled={createSessionMutation.isPending}
            className="flex-1"
          >
            {createSessionMutation.isPending ? "Accepting..." : "Accept"}
          </Button>
          <Button variant="secondary" size="md" onPress={handleAdjust}>
            Adjust
          </Button>
        </CardFooter>
      </Card>
    );
  },
);
