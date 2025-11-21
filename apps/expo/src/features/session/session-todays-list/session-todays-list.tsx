import type React from "react";
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

const itemSeparatorComponent = () => <ItemSeparator size="sm" />;

const renderItem = ({ item }: { item: Session }) => (
  <SessionItem session={item} />
);

const estimatedItemSize = SESSION_ITEM_HEIGHT + SEPARATOR_SIZE.sm;

export const SessionTodaysList: React.FC<SessionTodaysListProps> = ({
  sessions = [],
}) => (
  <LegendList
    data={sessions}
    estimatedItemSize={estimatedItemSize}
    contentContainerStyle={HORIZONTAL_CONTENT_CONTAINER_STYLE}
    ItemSeparatorComponent={itemSeparatorComponent}
    ListEmptyComponent={ListEmptyComponent}
    keyExtractor={keyExtractor}
    renderItem={renderItem}
    scrollEnabled={false}
    style={FLEX_1_STYLE}
  />
);
