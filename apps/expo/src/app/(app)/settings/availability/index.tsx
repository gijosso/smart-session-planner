import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ErrorScreen } from "~/components/error/error-screen";
import { LoadingScreen } from "~/components/layout/loading-screen";
import { AvailabilityCalendar } from "~/features/availability/availability-calendar";
import { useQueryErrorHandling } from "~/hooks/use-error-handling";
import { trpc } from "~/utils/api";

export default function AvailabilityList() {
  const queryClient = useQueryClient();
  const query = useQuery(trpc.availability.get.queryOptions());
  const { data: availability, isLoading } = query;

  const handleRetry = useCallback(() => {
    void queryClient.invalidateQueries(trpc.availability.get.queryFilter());
  }, [queryClient]);

  const errorHandling = useQueryErrorHandling(query, {
    onRetry: handleRetry,
    title: "Unable to load availability",
  });

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Availability" }} />
        <LoadingScreen />
      </>
    );
  }

  if (errorHandling.hasError && errorHandling.error) {
    return (
      <>
        <Stack.Screen options={{ title: "Availability" }} />
        <ErrorScreen
          error={errorHandling.error}
          onRetry={errorHandling.handleRetry}
          onReset={errorHandling.handleReset}
          title={errorHandling.errorTitle}
        />
      </>
    );
  }

  if (!availability) {
    return (
      <SafeAreaView className="bg-background">
        <Stack.Screen options={{ title: "Availability" }} />
        <View className="h-full w-full p-4">
          <Text className="text-foreground text-lg">
            No availability set. Click Edit to set your weekly availability.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="h-full w-full">
        <Stack.Screen
          options={{
            title: "Availability",
            headerRight: () => (
              <Pressable
                onPress={() => router.push("/settings/availability/edit")}
                className="px-4"
              >
                <Text className="text-primary text-base font-medium">Edit</Text>
              </Pressable>
            ),
          }}
        />
        <View className="flex-1">
          <AvailabilityCalendar
            weeklyAvailability={availability.weeklyAvailability}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
