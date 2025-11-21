import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { LoadingScreen } from "~/components";
import { AvailabilityCalendar } from "~/features/availability";
import { trpc } from "~/utils/api";

export default function AvailabilityList() {
  const {
    data: availability,
    isLoading,
    error,
  } = useQuery(trpc.availability.get.queryOptions());

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Availability" }} />
        <LoadingScreen />
      </>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="bg-background">
        <Stack.Screen options={{ title: "Availability" }} />
        <View className="h-full w-full p-4">
          <Text className="text-destructive text-lg">
            Error loading availability: {error.message}
          </Text>
        </View>
      </SafeAreaView>
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
