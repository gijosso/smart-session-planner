import type React from "react";
import { Text, View } from "react-native";
import { LegendList } from "@legendapp/list";

import type { RouterOutputs } from "~/utils/api";
import { SessionItem } from "./session-item";

type Session = RouterOutputs["session"]["today"][number];

interface SessionTodaysListProps {
  sessions?: Session[];
}

const keyExtractor = (item: Session) => item.id;

const ItemSeparatorComponent = () => <View className="h-2" />;

const ListEmptyComponent = () => (
  <View className="py-4">
    <Text className="text-muted-foreground text-center">
      No sessions scheduled for today
    </Text>
  </View>
);

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
