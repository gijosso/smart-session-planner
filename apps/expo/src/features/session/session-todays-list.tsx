import type React from "react";
import { Text, View } from "react-native";
import { LegendList } from "@legendapp/list";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { trpc } from "~/utils/api";
import { invalidateSessionQueries } from "~/utils/session-cache";
import { SessionItem } from "./session-item";

type Session = RouterOutputs["session"]["today"][number];

interface SessionTodaysListProps {
  sessions?: Session[];
}

export const SessionTodaysList: React.FC<SessionTodaysListProps> = ({
  sessions = [],
}) => {
  const queryClient = useQueryClient();

  const toggleCompleteMutation = useMutation(
    trpc.session.toggleComplete.mutationOptions({
      onSettled: (_, __, variables) => {
        // Find the session that was toggled to invalidate based on its date
        const session = sessions.find((s) => s.id === variables.id);
        if (session) {
          invalidateSessionQueries(queryClient, {
            startTime: session.startTime,
            id: session.id,
          });
        }
      },
    }),
  );

  return (
    <LegendList
      data={sessions}
      estimatedItemSize={20}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={(p) => (
        <SessionItem
          session={p.item}
          onToggleComplete={() =>
            toggleCompleteMutation.mutate({ id: p.item.id })
          }
        />
      )}
      ListEmptyComponent={() => (
        <View className="py-4">
          <Text className="text-muted-foreground text-center">
            No sessions scheduled for today
          </Text>
        </View>
      )}
    />
  );
};
