import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useGlobalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, LoadingScreen } from "~/components";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { trpc } from "~/utils/api";
import { formatDateForDisplay, formatTimeRange } from "~/utils/date";
import { invalidateSessionQueries } from "~/utils/session-cache";

const PRIORITY_LEVELS = [1, 2, 3, 4, 5] as const;

export default function Session() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery(
    trpc.session.byId.queryOptions({ id }),
  );

  const toggleCompleteMutation = useMutation(
    trpc.session.toggleComplete.mutationOptions({
      onSettled: () => {
        // Use current session data for invalidation (date hasn't changed, just completion status)
        if (data) {
          invalidateSessionQueries(queryClient, {
            startTime: data.startTime,
            id: data.id,
          });
        }
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.session.delete.mutationOptions({
      onSuccess: () => {
        // Store session data before removing query (needed for cache invalidation)
        const sessionData = data;

        // Remove the byId query from cache first to prevent refetch errors
        // This prevents React Query from trying to refetch a deleted session
        if (id) {
          queryClient.removeQueries(trpc.session.byId.queryFilter({ id }));
        }

        // Invalidate other queries based on session date
        // Note: We skip invalidating byId since we already removed it above
        if (sessionData) {
          invalidateSessionQueries(queryClient, {
            startTime: sessionData.startTime,
            // Don't pass id to avoid invalidating byId (we already removed it)
          });
        }

        // Navigate back to home after successful deletion
        router.replace("/home");
      },
    }),
  );

  const handleDelete = () => {
    Alert.alert(
      "Delete Session",
      `Are you sure you want to delete "${data?.title}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (id) {
              deleteMutation.mutate({ id });
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !data) {
    return (
      <SafeAreaView className="bg-background">
        <Stack.Screen options={{ title: "Session" }} />
        <View className="h-full w-full p-4">
          <Text className="text-destructive text-lg">
            {error?.message ?? "Session not found"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1">
      <Stack.Screen options={{ title: data.title }} />
      <View className="h-full w-full p-4">
        <View className="mb-6">
          <View className="mb-2 flex flex-row items-center gap-2">
            <Text className="text-primary text-3xl font-bold">
              {data.title}
            </Text>
            {data.completed && (
              <View className="bg-primary rounded-full px-2 py-1">
                <Text className="text-primary-foreground text-xs font-semibold">
                  ✓ Done
                </Text>
              </View>
            )}
          </View>

          <Text className="text-muted-foreground mb-4 text-lg">
            {SESSION_TYPES_DISPLAY[data.type].label}
          </Text>

          <View className="mb-4">
            <Text className="text-muted-foreground mb-1 text-sm">Priority</Text>
            <View className="flex flex-row gap-2">
              {PRIORITY_LEVELS.map((priority) => (
                <View
                  key={priority}
                  className={`rounded-md border px-3 py-1 ${
                    data.priority === priority
                      ? "bg-primary border-primary"
                      : "border-input bg-background"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      data.priority === priority
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {priority}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-muted-foreground mb-1 text-sm">Date</Text>
            <Text className="text-foreground text-base">
              {formatDateForDisplay(data.startTime)}
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-muted-foreground mb-1 text-sm">Time</Text>
            <Text className="text-foreground text-base">
              {formatTimeRange(data.startTime, data.endTime)}
            </Text>
          </View>

          {data.description && (
            <View className="mb-4">
              <Text className="text-muted-foreground mb-1 text-sm">
                Description
              </Text>
              <Text className="text-foreground text-base">
                {data.description}
              </Text>
            </View>
          )}

          <Button
            variant={data.completed ? "secondary" : "default"}
            onPress={() => toggleCompleteMutation.mutate({ id: data.id })}
            disabled={toggleCompleteMutation.isPending}
            className="mt-4"
          >
            {toggleCompleteMutation.isPending
              ? "Updating..."
              : data.completed
                ? "Mark as Incomplete"
                : "Mark as Complete"}
          </Button>
          <Button
            variant="default"
            onPress={() => router.push(`/session/${id}/update`)}
            className="mt-4"
          >
            Update
          </Button>

          <Button
            variant="destructive"
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
            className="mt-4"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Session"}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
