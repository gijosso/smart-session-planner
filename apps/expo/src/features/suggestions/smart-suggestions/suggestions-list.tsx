import type React from "react";
import { Text, View } from "react-native";
import { LegendList } from "@legendapp/list";

import { SuggestionItem } from "./suggestion-item";

interface SuggestionsListProps {
  suggestions: {
    id: string;
    startTime: Date;
    endTime: Date;
    score: number;
    reasons: string[];
  }[];
}

/**
 * Horizontal scrolling list of suggestions
 */
export const SuggestionsList: React.FC<SuggestionsListProps> = ({
  suggestions,
}) => {
  return (
    <LegendList
      data={suggestions}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      ItemSeparatorComponent={() => <View className="w-4" />}
      contentContainerStyle={{
        paddingHorizontal: 16,
      }}
      ListEmptyComponent={() => (
        <View className="py-4">
          <Text className="text-muted-foreground text-center">
            No suggestions available. Make sure you have availability windows
            set up.
          </Text>
        </View>
      )}
      renderItem={({ item: suggestion }) => (
        <SuggestionItem suggestion={suggestion} />
      )}
    />
  );
};
