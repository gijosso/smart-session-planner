import type React from "react";
import { LegendList } from "@legendapp/list";

import type { RouterOutputs } from "~/utils/api";
import { SessionItem } from "../session-item";
import { ItemSeparatorComponent } from "./item-separator";
import { ListEmptyComponent } from "./list-empty";

type Session = RouterOutputs["session"]["today"][number];

interface SessionTodaysListProps {
  sessions?: Session[];
}

const keyExtractor = (item: Session) => item.id;

export const SessionTodaysList: React.FC<SessionTodaysListProps> = ({
  sessions = [],
}) => {
  return (
    <LegendList
      data={sessions}
      estimatedItemSize={20}
      ItemSeparatorComponent={ItemSeparatorComponent}
      ListEmptyComponent={ListEmptyComponent}
      keyExtractor={keyExtractor}
      renderItem={(p) => <SessionItem session={p.item} />}
    />
  );
};

