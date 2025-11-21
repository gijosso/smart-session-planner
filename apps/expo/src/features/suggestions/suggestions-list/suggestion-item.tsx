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
import {
  PRIORITY_LEVELS,
  SUGGESTION_ITEM_HEIGHT,
  SUGGESTION_ITEM_WIDTH,
  SUGGESTION_LOOK_AHEAD_DAYS,
} from "~/constants/app";
import { COLORS_MUTED } from "~/constants/colors";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { invalidateSessionQueries } from "~/utils/session-cache";
import {
  formatDateDisplay,
  formatTimeRange,
} from "~/utils/suggestion-formatting";
import { getSuggestionMutationOptions } from "~/utils/suggestion-id";

interface SuggestionItemProps {
  suggestion: SuggestionWithId;
  horizontal?: boolean;
}

/**
 * Individual suggestion item component
 * Displays a single suggestion in a horizontal scrolling list
 */
export const SuggestionItem = React.memo<SuggestionItemProps>(
  ({ suggestion, horizontal = false }) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const toast = useToast();

    // Create session mutation with React Query-native optimistic updates
    const createSessionMutation = useMutation(
      trpc.session.create.mutationOptions({
        ...getSuggestionMutationOptions(queryClient, {
          lookAheadDays: SUGGESTION_LOOK_AHEAD_DAYS,
        }),
        onSuccess: (data) => {
          // Invalidate queries based on session date (granular invalidation)
          invalidateSessionQueries(queryClient, {
            startTime: data.startTime,
            id: data.id,
          });
          toast.success("Session created successfully");
        },
        onError: createMutationErrorHandler({
          errorMessage: "Failed to create session. Please try again.",
        }),
      }),
    );

    // Optimize handleAccept - only depend on mutation and suggestion id
    // The mutation will use the current suggestion values when called
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
    }, [suggestion, createSessionMutation]);

    // Optimize handleAdjust - only depend on router and suggestion id
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
    }, [suggestion, router]);

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
      <View
        style={{
          width: horizontal ? SUGGESTION_ITEM_WIDTH : undefined,
          height: SUGGESTION_ITEM_HEIGHT,
        }}
      >
        <Card variant="muted" className="bg-suggestion-card flex-1 p-6">
          <CardHeader>
            <View className="flex flex-1 flex-row items-center justify-end">
              <View className="flex flex-row items-center gap-1">
                {PRIORITY_LEVELS.map((level) => (
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

          <CardContent className="flex flex-1 flex-col justify-center gap-4">
            <View className="flex flex-row items-center gap-2">
              <Ionicons
                name="time-outline"
                size={22}
                color={COLORS_MUTED}
                accessibilityLabel="Time icon"
              />

              <Text className="text-secondary-foreground">{formattedDate}</Text>

              <View className="bg-muted-foreground h-1 w-1 rounded-full" />

              <Text className="text-secondary-foreground">
                {formattedTimeRange}
              </Text>
            </View>

            {suggestion.reasons.length > 0 && (
              <Text className="text-secondary-foreground" numberOfLines={3}>
                {reasonsText}.
              </Text>
            )}
          </CardContent>

          <CardFooter className="flex flex-row gap-4">
            <Button
              size="lg"
              onPress={handleAccept}
              disabled={createSessionMutation.isPending}
              className="flex-1"
              accessibilityLabel={`Accept suggestion: ${suggestion.title}`}
              accessibilityRole="button"
            >
              {createSessionMutation.isPending ? "Accepting..." : "Accept"}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onPress={handleAdjust}
              accessibilityLabel={`Adjust suggestion: ${suggestion.title}`}
              accessibilityRole="button"
            >
              Adjust
            </Button>
          </CardFooter>
        </Card>
      </View>
    );
  },
);
