import type { LegendListProps } from "@legendapp/list";
import type { ComponentRef } from "react";
import { memo, useCallback, useMemo, useRef } from "react";
import { LegendList } from "@legendapp/list";

import type { SuggestionWithId } from "~/types";
import {
  HORIZONTAL_CONTENT_CONTAINER_STYLE,
  ItemSeparator,
  useRefreshControl,
  useScrollToTop,
  VERTICAL_CONTENT_CONTAINER_STYLE,
} from "~/components/list";
import { FLEX_1_STYLE, SUGGESTION_ITEM_HEIGHT } from "~/constants/app";
import { SuggestionItem } from "./suggestion-item";
import { ListEmptyComponent } from "./suggestions-list-empty";

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
    const { contentContainerStyle, estimatedItemSize } = useMemo(
      () => ({
        contentContainerStyle: horizontal
          ? HORIZONTAL_CONTENT_CONTAINER_STYLE
          : VERTICAL_CONTENT_CONTAINER_STYLE,
        estimatedItemSize: SUGGESTION_ITEM_HEIGHT,
      }),
      [horizontal],
    );
    const renderItem = useCallback(
      ({ item }: { item: SuggestionWithId }) => (
        <SuggestionItem suggestion={item} horizontal={horizontal} />
      ),
      [horizontal],
    );
    const ItemSeparatorComponent = useCallback(
      () => <ItemSeparator horizontal={horizontal} size="md" />,
      [horizontal],
    );

    const refreshControl = useRefreshControl({
      isLoading,
      onRefresh,
      horizontal,
    });

    useScrollToTop(listRef, horizontal, suggestions.length > 0);

    return (
      <LegendList<SuggestionWithId>
        ref={listRef}
        data={suggestions}
        keyExtractor={keyExtractor}
        horizontal={horizontal}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={ItemSeparatorComponent}
        contentContainerStyle={contentContainerStyle}
        ListEmptyComponent={ListEmptyComponent}
        renderItem={renderItem}
        refreshControl={refreshControl}
        estimatedItemSize={estimatedItemSize}
        style={FLEX_1_STYLE}
        {...legendListProps}
      />
    );
  },
);
