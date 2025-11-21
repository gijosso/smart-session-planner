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
import { SEPARATOR_SIZE } from "~/components/list/item-separator";
import { ListEmptyComponent } from "./list-empty";
import {
  SUGGESTION_ITEM_HEIGHT,
  SUGGESTION_ITEM_WIDTH,
  SuggestionItem,
} from "./suggestion-item";

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

const itemSeparatorComponent = () => <ItemSeparator horizontal size="md" />;

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
        estimatedItemSize:
          (horizontal ? SUGGESTION_ITEM_WIDTH : SUGGESTION_ITEM_HEIGHT) +
          SEPARATOR_SIZE.md,
      }),
      [horizontal],
    );
    const renderItem = useCallback(
      ({ item }: { item: SuggestionWithId }) => (
        <SuggestionItem suggestion={item} horizontal={horizontal} />
      ),
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
        ItemSeparatorComponent={itemSeparatorComponent}
        contentContainerStyle={contentContainerStyle}
        ListEmptyComponent={ListEmptyComponent}
        renderItem={renderItem}
        refreshControl={refreshControl}
        estimatedItemSize={estimatedItemSize}
        {...legendListProps}
      />
    );
  },
);
