import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { trpc } from "~/utils/api";
import { invalidateSessionQueries } from "~/utils/session-cache";
import {
  formatDateDisplay,
  formatScore,
  formatTimeRange,
} from "~/utils/suggestion-formatting";
import {
  addSuggestionIds,
  invalidateSuggestionById,
} from "~/utils/suggestion-id";

/**
 * Suggestions Screen
 * Displays all available time slot suggestions for a session type
 */
export default function SuggestionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Fetch suggestions (no type or priority needed - based on repeating patterns)
  const { data: rawSuggestions, isLoading } = useQuery(
    trpc.session.suggest.queryOptions({
      lookAheadDays: 14,
    }),
  );

  // Add idempotency IDs to suggestions for React Query tracking
  const suggestions = useMemo(() => {
    if (!rawSuggestions) return undefined;
    return addSuggestionIds(rawSuggestions);
  }, [rawSuggestions]);

  // Create session mutation
  const createSessionMutation = useMutation(
    trpc.session.create.mutationOptions({
      onSuccess: (data, variables) => {
        // Invalidate queries based on session date (granular invalidation)
        invalidateSessionQueries(queryClient, {
          startTime: data.startTime,
          id: data.id,
        });

        // Also invalidate upcoming sessions
        void queryClient.invalidateQueries(trpc.session.upcoming.queryFilter());

        // Invalidate the specific suggestion if it was created from one
        if (variables.fromSuggestionId) {
          invalidateSuggestionById(queryClient, variables.fromSuggestionId, {
            lookAheadDays: 14,
          });
        }

        // Navigate back after successful creation
        router.back();
      },
    }),
  );

  const handleAccept = (suggestion: {
    id: string;
    title: string;
    type: SessionType;
    startTime: Date;
    endTime: Date;
    priority: number;
    description?: string;
    score: number;
    reasons: string[];
  }) => {
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
  };

  const handleAdjust = (suggestion: {
    id: string;
    title: string;
    type: SessionType;
    startTime: Date;
    endTime: Date;
    priority: number;
    description?: string;
  }) => {
    router.push({
      pathname: "/session/create",
      params: {
        title: suggestion.title,
        type: suggestion.type,
        suggestedStartTime: suggestion.startTime.toISOString(),
        suggestedEndTime: suggestion.endTime.toISOString(),
        priority: suggestion.priority.toString(),
        suggestionId: suggestion.id,
        ...(suggestion.description && { description: suggestion.description }),
      },
    });
  };

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="h-full w-full">
        <View className="border-b-border flex flex-row items-center justify-between border-b p-4">
          <Pressable onPress={() => router.back()}>
            <Text className="text-primary text-base">← Back</Text>
          </Pressable>
          <Text className="text-foreground text-lg font-semibold">
            Smart Suggestions
          </Text>
          <View className="w-12" />
        </View>

        <View className="border-b-border bg-muted border-b p-4">
          <View className="flex flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="text-foreground text-lg font-semibold">
                Smart Suggestions
              </Text>
              <Text className="text-muted-foreground text-sm">
                Based on your repeating tasks
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-4 text-sm">
              Finding the best times for you...
            </Text>
          </View>
        ) : !suggestions || suggestions.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8">
            <Text className="text-muted-foreground text-center text-base">
              No suggestions available. Make sure you have availability windows
              set up.
            </Text>
            <Pressable
              onPress={() => router.push("/settings/availability")}
              className="mt-4"
            >
              <Text className="text-primary text-sm font-medium">
                Set up availability →
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16 }}
          >
            <Text className="text-muted-foreground mb-4 text-sm">
              {suggestions.length} suggestion
              {suggestions.length !== 1 ? "s" : ""} found
            </Text>

            {suggestions.map((suggestion) => {
              const suggestionTypeDisplay =
                SESSION_TYPES_DISPLAY[suggestion.type];
              const suggestionCardColor = suggestionTypeDisplay.color;
              return (
                <View
                  key={suggestion.id}
                  className="mb-4 rounded-xl p-5"
                  style={{ backgroundColor: `${suggestionCardColor}15` }}
                >
                  <View className="mb-3 flex flex-row items-center justify-between">
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: `${suggestionCardColor}30` }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: suggestionCardColor }}
                      >
                        {suggestionTypeDisplay.label}
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: `${suggestionCardColor}30` }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: suggestionCardColor }}
                      >
                        {formatScore(suggestion.score)} ({suggestion.score}/100)
                      </Text>
                    </View>
                  </View>

                  <View className="mb-3 flex flex-row items-center gap-2">
                    <Text className="text-muted-foreground text-sm">🕐</Text>
                    <Text className="text-foreground text-base font-medium">
                      {formatDateDisplay(suggestion.startTime)} ·{" "}
                      {formatTimeRange(
                        suggestion.startTime,
                        suggestion.endTime,
                      )}
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

                  <View className="flex flex-row gap-3">
                    <Pressable
                      onPress={() => handleAccept(suggestion)}
                      disabled={createSessionMutation.isPending}
                      className="bg-foreground flex-1 rounded-lg px-4 py-3"
                    >
                      <Text className="text-background text-center text-sm font-semibold">
                        {createSessionMutation.isPending
                          ? "Accepting..."
                          : "Accept"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleAdjust(suggestion)}
                      className="border-foreground/20 bg-background flex-1 rounded-lg border px-4 py-3"
                    >
                      <Text className="text-foreground text-center text-sm font-semibold">
                        Adjust
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
