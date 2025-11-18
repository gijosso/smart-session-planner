import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { DAYS_OF_WEEK_DISPLAY } from "~/constants/activity";
import { trpc } from "~/utils/api";

const formatTime = (time: string): string => {
  // Convert HH:MM:SS to HH:MM for display
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
};

const formatTimeRange = (start: string, end: string): string => {
  return `${formatTime(start)} - ${formatTime(end)}`;
};

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

  // Group availability by day of week
  const availabilityByDay = availabilityList.reduce(
    (acc, item) => {
      const day = item.dayOfWeek;
      const existing = acc[day];
      if (existing) {
        existing.push(item);
      } else {
        acc[day] = [item];
      }
      return acc;
    },
    {} as Record<string, typeof availabilityList>,
  );

  return (
    <SafeAreaView className="bg-background flex-1">
      <Stack.Screen options={{ title: "Availability" }} />
      <ScrollView className="flex-1">
        <View className="p-4">
          {availabilityList.length === 0 ? (
            <View className="flex-1 items-center justify-center p-4">
              <Text className="text-muted-foreground text-center text-lg">
                No availability windows set
              </Text>
              <Text className="text-muted-foreground mt-2 text-center text-sm">
                Add your weekly availability windows to get started
              </Text>
            </View>
          ) : (
            <View className="flex-1">
              {Object.values(DAYS_OF_WEEK_DISPLAY).map((day) => {
                const dayAvailability = availabilityByDay[day.value] ?? [];
                if (dayAvailability.length === 0) return null;

                const displayName = day.label;

                return (
                  <View key={day.value} className="mb-4">
                    <Text className="text-foreground mb-2 text-lg font-semibold">
                      {displayName}
                    </Text>
                    {dayAvailability.map((item) => (
                      <Link
                        key={item.id}
                        asChild
                        href={{
                          pathname: "/settings/availability/[id]/update",
                          params: { id: item.id },
                        }}
                      >
                        <Pressable className="border-input bg-background mb-2 flex flex-row items-center justify-between rounded-md border px-4 py-3">
                          <Text className="text-foreground text-base">
                            {formatTimeRange(item.startTime, item.endTime)}
                          </Text>
                          <Text className="text-muted-foreground text-sm">
                            Edit →
                          </Text>
                        </Pressable>
                      </Link>
                    ))}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
