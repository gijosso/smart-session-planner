import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router, Stack } from "expo-router";
import { LegendList } from "@legendapp/list";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function AvailabilityList() {
  const {
    data: availability,
    isLoading,
    error,
  } = useQuery(trpc.availability.all.queryOptions());

  if (isLoading) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Availability" }} />
        <ActivityIndicator size="large" />
      </SafeAreaView>
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

  const availabilityList = availability ?? [];

  return (
    <SafeAreaView className="bg-background flex-1">
      <Stack.Screen options={{ title: "Availability" }} />
      <View className="h-full w-full">
        <View className="flex flex-row items-center justify-between p-4">
          <Text className="text-foreground text-lg font-semibold">
            Availability Windows
          </Text>
          <Pressable
            onPress={() => router.push("/settings/availability/create")}
          >
            <Text className="text-primary text-base font-medium underline">
              Add New
            </Text>
          </Pressable>
        </View>
        <LegendList
          data={availabilityList}
          estimatedItemSize={20}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={(p) => (
            <Link
              href={{
                pathname: "/settings/availability/[id]/update",
                params: { id: p.item.id },
              }}
              asChild
            >
              <Pressable className="p-4">
                <Text className="text-foreground text-lg font-semibold">
                  {p.item.dayOfWeek}
                </Text>
              </Pressable>
            </Link>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
