import type React from "react";
import { Text, View } from "react-native";

import { SuggestionsList } from "./suggestions-list";

interface SuggestionsProps {
  suggestions: {
    id: string;
    startTime: Date;
    endTime: Date;
    score: number;
    reasons: string[];
  }[];
}

/**
 * Smart Suggestions Card Component
 */
export const Suggestions: React.FC<SuggestionsProps> = ({ suggestions }) => {
  if (suggestions.length === 0) {
    return (
      <View className="flex items-center justify-center py-8">
        <Text className="text-muted-foreground py-4 text-center text-sm">
          No suggestions available. Make sure you have availability windows set
          up.
        </Text>
      </View>
    );
  }

  return <SuggestionsList suggestions={suggestions} />;
};
