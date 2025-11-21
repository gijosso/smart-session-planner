import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import type { SuggestionWithId } from "~/types";
import { Button, LoadingScreen, Screen } from "~/components";
import { SUGGESTION_LOOK_AHEAD_DAYS } from "~/constants/app";
import { SuggestionsList } from "~/features/suggestions";
import { trpc } from "~/utils/api";
import { addSuggestionIds } from "~/utils/suggestions/suggestion-id";

/**
 * Suggestions Screen
 * Displays all available time slot suggestions for a session type
 */
export default function SuggestionsScreen() {
  const router = useRouter();
  const {
    data: rawSuggestions,
    isLoading,
    refetch,
  } = useQuery(
    trpc.session.suggest.queryOptions({
      lookAheadDays: SUGGESTION_LOOK_AHEAD_DAYS,
    }),
  );

  // Add idempotency IDs to suggestions for React Query tracking
  // Only process if data exists and hasn't been processed yet
  const suggestions: SuggestionWithId[] = useMemo(() => {
    if (!rawSuggestions) return [];
    // Check if IDs already exist (optimization to avoid unnecessary processing)
    const hasIds = rawSuggestions.some(
      (s) => "id" in s && typeof s.id === "string",
    );
    if (hasIds) {
      return rawSuggestions as SuggestionWithId[];
    }
    return addSuggestionIds(rawSuggestions);
  }, [rawSuggestions]);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNavigateToAvailability = useCallback(() => {
    router.push("/settings/availability");
  }, [router]);

  const ListEmptyComponent = useCallback(
    () => (
      <View className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <Text className="text-muted-foreground text-center text-base">
          No suggestions available.
        </Text>
        <Text className="text-muted-foreground text-center text-base">
          Make sure you have availability windows set up.
        </Text>
        <Button onPress={handleNavigateToAvailability}>
          Set up availability
        </Button>
      </View>
    ),
    [handleNavigateToAvailability],
  );

  if (!rawSuggestions) {
    return <LoadingScreen />;
  }

  return (
    <Screen variant="list" title="Smart Suggestions" backButton>
      <View className="border-border bg-muted border p-4">
        <View className="flex flex-col">
          <Text className="text-foreground text-xl font-semibold">
            Smart Suggestions
          </Text>
          <Text className="text-secondary-foreground text-md">
            Based on your tasks
          </Text>
        </View>
      </View>

      <SuggestionsList
        suggestions={suggestions}
        horizontal={false}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        ListEmptyComponent={ListEmptyComponent}
      />
    </Screen>
  );
}
