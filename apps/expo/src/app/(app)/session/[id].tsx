import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useGlobalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function Session() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery(
    trpc.session.byId.queryOptions({ id }),
  );

  const toggleCompleteMutation = useMutation(
    trpc.session.toggleComplete.mutationOptions({
      onSettled: () => {
        void queryClient.invalidateQueries(
          trpc.session.byId.queryFilter({ id }),
        );
        void queryClient.invalidateQueries(trpc.session.today.queryFilter());
      },
    }),
  );

  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimeRange = (start: Date | string, end: Date | string) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
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
            {data.type}
          </Text>

          <View className="mb-4">
            <Text className="text-muted-foreground mb-1 text-sm">Date</Text>
            <Text className="text-foreground text-base">
              {formatDate(data.startTime)}
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

          <Pressable
            onPress={() => toggleCompleteMutation.mutate({ id: data.id })}
            disabled={toggleCompleteMutation.isPending}
            className={`mt-4 rounded-md border px-4 py-3 ${
              data.completed
                ? "bg-muted border-input"
                : "bg-primary border-primary"
            }`}
          >
            <Text
              className={`text-center text-base font-semibold ${
                data.completed ? "text-foreground" : "text-primary-foreground"
              }`}
            >
              {toggleCompleteMutation.isPending
                ? "Updating..."
                : data.completed
                  ? "Mark as Incomplete"
                  : "Mark as Complete"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
