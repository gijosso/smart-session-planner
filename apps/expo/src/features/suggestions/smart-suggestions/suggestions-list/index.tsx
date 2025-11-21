import type { LegendListProps } from "@legendapp/list";
import type { ComponentRef } from "react";
import type { ViewStyle } from "react-native";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { RefreshControl } from "react-native";
import { LegendList } from "@legendapp/list";

import type { SuggestionWithId } from "~/types";
import { SuggestionItem } from "../suggestion-item";
import { ItemSeparatorComponent } from "./item-separator";
import { ListEmptyComponent } from "./list-empty";

type SuggestionsListProps = {
  suggestions: SuggestionWithId[];
  horizontal?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
} & Pick<
  LegendListProps<SuggestionWithId>,
  | "data"
  | "keyExtractor"
  | "renderItem"
  | "horizontal"
  | "showsHorizontalScrollIndicator"
  | "ItemSeparatorComponent"
  | "ListEmptyComponent"
  | "ListHeaderComponent"
  | "refreshControl"
>;

const keyExtractor = (item: SuggestionWithId) => item.id;

const HORIZONTAL_CONTENT_CONTAINER_STYLE: ViewStyle = {
  paddingHorizontal: 22,
};

const VERTICAL_CONTENT_CONTAINER_STYLE: ViewStyle = {
  padding: 22,
};

/**
 * List of suggestions - supports both horizontal and vertical layouts
 */
export const SuggestionsList = memo<SuggestionsListProps>(
  ({
    suggestions,
    horizontal = true,
    isLoading = false,
    onRefresh,
    ...legendListProps
  }) => {
    const listRef =
      useRef<ComponentRef<typeof LegendList<SuggestionWithId>>>(null);

    const renderItem = useCallback(
      ({ item: suggestion }: { item: SuggestionWithId }) => (
        <SuggestionItem suggestion={suggestion} />
      ),
      [],
    );

    const defaultContentStyle = useMemo(
      () =>
        horizontal
          ? HORIZONTAL_CONTENT_CONTAINER_STYLE
          : VERTICAL_CONTENT_CONTAINER_STYLE,
      [horizontal],
    );

    const refreshControl = useMemo(() => {
      if (!onRefresh || horizontal) {
        return undefined;
      }
      return <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />;
    }, [isLoading, onRefresh, horizontal]);

    // Scroll to top when component mounts or when suggestions change
    useEffect(() => {
      if (!horizontal && listRef.current && suggestions.length > 0) {
        // Use requestAnimationFrame to ensure the list is fully laid out
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Double RAF to ensure layout is complete
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          });
        });
      }
    }, [horizontal, suggestions.length]);

    const itemSeparatorComponent = useCallback(
      () => <ItemSeparatorComponent horizontal={horizontal} />,
      [horizontal],
    );

    return (
      <LegendList<SuggestionWithId>
        ref={listRef}
        data={suggestions}
        keyExtractor={keyExtractor}
        horizontal={horizontal}
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={itemSeparatorComponent}
        contentContainerStyle={defaultContentStyle}
        ListEmptyComponent={ListEmptyComponent}
        renderItem={renderItem}
        refreshControl={refreshControl}
        {...legendListProps}
      />
    );
  },
);
