import { useCallback } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Button } from "~/components/button";
import { LoadingScreen } from "~/components/layout/loading-screen";
import { Screen } from "~/components/layout/screen";
import { SUGGESTION_LOOK_AHEAD_DAYS } from "~/constants/app";
import { SuggestionsList } from "~/features/suggestions/suggestions-list";
import { usePaginatedSuggestions } from "~/hooks/use-paginated-suggestions";

/**
 * Suggestions Screen
 * Displays all available time slot suggestions for a session type
 * Supports pagination with infinite scroll
 */
export default function SuggestionsScreen() {
  const router = useRouter();
  const {
    suggestions,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    isInitialLoad,
  } = usePaginatedSuggestions({
    lookAheadDays: SUGGESTION_LOOK_AHEAD_DAYS,
  });

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

  const ListFooterComponent = useCallback(() => {
    if (!hasMore) return null;
    if (isLoadingMore) {
      return (
        <View className="p-4">
          <Text className="text-muted-foreground text-center text-sm">
            Loading more suggestions...
          </Text>
        </View>
      );
    }
    return (
      <View className="p-4">
        <Button
          variant="outline"
          onPress={loadMore}
          accessibilityLabel="Load more suggestions"
        >
          <Text>Load More</Text>
        </Button>
      </View>
    );
  }, [hasMore, isLoadingMore, loadMore]);

  if (isInitialLoad) {
    return <LoadingScreen />;
  }

  return (
    <Screen variant="list" title="Smart Suggestions" backButton>
      <View className="border-border bg-progress-card border p-4">
        <View className="flex flex-col">
          <Text className="text-foreground text-xl font-semibold">
            Smart Suggestions
          </Text>
          <Text className="text-secondary-foreground text-md">
            Based on your completed tasks
          </Text>
        </View>
      </View>

      <SuggestionsList
        suggestions={suggestions}
        horizontal={false}
        isLoading={isLoading || isRefreshing}
        onRefresh={refresh}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </Screen>
  );
}
