import React from "react";
import { Text, View } from "react-native";

import type { SuggestionWithId } from "~/types";
import { SuggestionsList } from "./suggestions-list";

interface SuggestionsProps {
  suggestions: SuggestionWithId[];
}

const EmptyState = React.memo(() => (
  <View className="flex items-center justify-center py-8">
    <Text className="text-muted-foreground py-4 text-center text-sm">
      No suggestions available. Make sure you have availability windows set up.
    </Text>
  </View>
));
EmptyState.displayName = "EmptyState";

/**
 * Smart Suggestions Card Component
 */
export const Suggestions = React.memo<SuggestionsProps>(({ suggestions }) => {
  if (suggestions.length === 0) {
    return <EmptyState />;
  }

  return <SuggestionsList suggestions={suggestions} />;
});
