import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ErrorScreen, LoadingScreen } from "~/components";
import { AvailabilityCalendar } from "~/features/availability";
import { useQueryError } from "~/hooks/use-query-error";
import { trpc } from "~/utils/api";

export default function AvailabilityList() {
  const queryClient = useQueryClient();
  const {
    data: availability,
    isLoading,
    error,
  } = useQuery(trpc.availability.get.queryOptions());
  const queryError = useQueryError({ error });

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Availability" }} />
        <LoadingScreen />
      </>
    );
  }

  if (queryError.hasError && queryError.error) {
    return (
      <>
        <Stack.Screen options={{ title: "Availability" }} />
        <ErrorScreen
          error={queryError.error}
          onRetry={() => {
            void queryClient.invalidateQueries(trpc.availability.get.queryFilter());
          }}
          onReset={() => router.back()}
          title="Unable to load availability"
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
