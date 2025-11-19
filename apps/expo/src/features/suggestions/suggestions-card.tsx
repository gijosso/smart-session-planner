import type React from "react";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import { trpc } from "~/utils/api";
import { addSuggestionIds, removeSuggestionById } from "~/utils/suggestion-id";
import { SuggestionsList } from "./suggestions-list";

interface SuggestionsCardProps {
  sessionType: SessionType;
  durationMinutes: number;
  priority?: number;
  onSuggestionAccepted?: () => void;
}

/**
 * Smart Suggestions Card Component
 * Displays AI-powered time slot suggestions for scheduling sessions
 */
export const SuggestionsCard: React.FC<SuggestionsCardProps> = ({
  sessionType,
  durationMinutes,
  priority = 3,
  onSuggestionAccepted,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch suggestions
  const { data: rawSuggestions, isLoading } = useQuery(
    trpc.session.suggest.queryOptions({
      type: sessionType,
      durationMinutes,
      priority,
      lookAheadDays: 14,
    }),
  );

  // Add idempotency IDs to suggestions for React Query tracking
  const suggestions = useMemo(() => {
    if (!rawSuggestions) return undefined;
    return addSuggestionIds(rawSuggestions);
  }, [rawSuggestions]);

  // Callback to remove a suggestion from the React Query cache
  const handleSuggestionAccepted = (suggestionId: string) => {
    removeSuggestionById(queryClient, suggestionId, {
      type: sessionType,
      durationMinutes,
      priority,
      lookAheadDays: 14,
    });

    onSuggestionAccepted?.();
  };

  if (isLoading) {
    return (
      <View className="bg-card border-border rounded-xl border p-5 shadow-sm">
        <View className="mb-4">
          <Text className="text-foreground text-lg font-semibold">
            Smart Suggestions
          </Text>
        </View>
        <View className="flex items-center justify-center py-8">
          <ActivityIndicator size="small" />
          <Text className="text-muted-foreground mt-3 text-sm">
            Finding the best times for you...
          </Text>
        </View>
      </View>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <View className="bg-card border-border rounded-xl border p-5 shadow-sm">
        <View className="mb-4">
          <Text className="text-foreground text-lg font-semibold">
            Smart Suggestions
          </Text>
        </View>
        <Text className="text-muted-foreground py-4 text-center text-sm">
          No suggestions available. Make sure you have availability windows set
          up.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View className="mb-4 flex flex-row items-center justify-between">
        <Text className="text-foreground text-lg font-semibold">
          Smart Suggestions
        </Text>
        {suggestions.length > 1 && (
          <Pressable
            onPress={() => {
              router.push({
                pathname: "/suggestions",
                params: {
                  type: sessionType,
                  durationMinutes: durationMinutes.toString(),
                  priority: priority.toString(),
                },
              });
            }}
          >
            <Text className="text-primary text-sm font-medium">See all →</Text>
          </Pressable>
        )}
      </View>

      <SuggestionsList
        suggestions={suggestions}
        sessionType={sessionType}
        durationMinutes={durationMinutes}
        priority={priority}
        onSuggestionAccepted={handleSuggestionAccepted}
        cardWidth={320}
      />
    </View>
  );
};
