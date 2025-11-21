import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "~/components/button";
import { LoadingScreen } from "~/components/layout/loading-screen";
import { Screen } from "~/components/layout/screen";
import { SuggestionsList } from "~/features/suggestions/smart-suggestions/suggestions-list";
import { trpc } from "~/utils/api";
import { addSuggestionIds } from "~/utils/suggestion-id";

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
      lookAheadDays: 14,
    }),
  );

  // Add idempotency IDs to suggestions for React Query tracking
  const suggestions = useMemo(
    () => (!rawSuggestions ? [] : addSuggestionIds(rawSuggestions)),
    [rawSuggestions],
  );

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

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
        ListEmptyComponent={() => (
          <View className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
            <Text className="text-muted-foreground text-center text-base">
              No suggestions available.
            </Text>
            <Text className="text-muted-foreground text-center text-base">
              Make sure you have availability windows set up.
            </Text>
            <Button onPress={() => router.push("/settings/availability")}>
              Set up availability
            </Button>
          </View>
        )}
      />
    </Screen>
  );
}
