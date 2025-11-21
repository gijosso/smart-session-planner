import { memo, useCallback } from "react";
import { LegendList } from "@legendapp/list";

import type { RouterOutputs } from "~/utils/api";
import {
  HORIZONTAL_CONTENT_CONTAINER_STYLE,
  ItemSeparator,
} from "~/components/list";
import { SEPARATOR_SIZE } from "~/components/list/item-separator";
import { FLEX_1_STYLE } from "~/constants/app";
import { ListEmptyComponent } from "./list-empty";
import { SESSION_ITEM_HEIGHT, SessionItem } from "./session-item";

type Session = RouterOutputs["session"]["today"][number];

interface SessionTodaysListProps {
  sessions?: Session[];
}

const keyExtractor = (item: Session) => item.id;

const estimatedItemSize = SESSION_ITEM_HEIGHT + SEPARATOR_SIZE.sm;

/**
 * List of today's sessions
 * Optimized with memoized render functions for better performance
 */
export const SessionTodaysList = memo<SessionTodaysListProps>(
  ({ sessions = [] }) => {
    const renderItem = useCallback(
      ({ item }: { item: Session }) => <SessionItem session={item} />,
      [],
    );

    const ItemSeparatorComponent = useCallback(
      () => <ItemSeparator size="sm" />,
      [],
    );

    return (
      <LegendList<Session>
        data={sessions}
        estimatedItemSize={estimatedItemSize}
        contentContainerStyle={HORIZONTAL_CONTENT_CONTAINER_STYLE}
        ItemSeparatorComponent={ItemSeparatorComponent}
        ListEmptyComponent={ListEmptyComponent}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        scrollEnabled={false}
        style={FLEX_1_STYLE}
      />
    );
  },
);

SessionTodaysList.displayName = "SessionTodaysList";
