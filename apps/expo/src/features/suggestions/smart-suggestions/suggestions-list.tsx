import React, { useCallback } from "react";
import { Text, View } from "react-native";
import { LegendList } from "@legendapp/list";

import type { SuggestionWithId } from "~/types";
import { SuggestionItem } from "./suggestion-item";

interface SuggestionsListProps {
  suggestions: SuggestionWithId[];
}

const keyExtractor = (item: SuggestionWithId) => item.id;

const ItemSeparatorComponent = React.memo(() => <View className="w-4" />);
ItemSeparatorComponent.displayName = "ItemSeparatorComponent";

const ListEmptyComponent = React.memo(() => (
  <View className="py-4">
    <Text className="text-muted-foreground text-center">
      No suggestions available. Make sure you have availability windows set up.
    </Text>
  </View>
));
ListEmptyComponent.displayName = "ListEmptyComponent";

const CONTENT_CONTAINER_STYLE = { paddingHorizontal: 16 };

/**
 * Horizontal scrolling list of suggestions
 */
export const SuggestionsList = React.memo<SuggestionsListProps>(
  ({ suggestions }) => {
    const renderItem = useCallback(
      ({ item: suggestion }: { item: SuggestionWithId }) => (
        <SuggestionItem suggestion={suggestion} />
      ),
      [],
    );

    return (
      <LegendList
        data={suggestions}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={ItemSeparatorComponent}
        contentContainerStyle={CONTENT_CONTAINER_STYLE}
        ListEmptyComponent={ListEmptyComponent}
        renderItem={renderItem}
      />
    );
  },
);
