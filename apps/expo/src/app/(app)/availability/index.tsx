import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AvailabilityForm } from "~/features/availability/availability-form";
import { trpc } from "~/utils/api";
import { transformMutationError } from "~/utils/formik";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const formatTime = (time: string): string => {
  // Convert HH:MM:SS to HH:MM for display
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
};

const formatTimeRange = (start: string, end: string): string => {
  return `${formatTime(start)} - ${formatTime(end)}`;
};

export default function Availability() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    data: availability,
    isLoading,
    error,
  } = useQuery(trpc.availability.all.queryOptions());

  const createMutation = useMutation(
    trpc.availability.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.availability.all.queryFilter());
        setEditingId(null);
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.availability.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.availability.all.queryFilter());
        setEditingId(null);
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.availability.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.availability.all.queryFilter());
      },
    }),
  );

  const handleDelete = (id: string, dayLabel: string, timeRange: string) => {
    Alert.alert("Delete Availability", `Delete ${dayLabel} ${timeRange}?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteMutation.mutate({ id });
        },
      },
    ]);
  };

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
    (acc, _item) => {
      // if (!acc[item.dayOfWeek]) {
      //   acc[item.dayOfWeek] = [];
      // }
      // acc[item.dayOfWeek].push(item);
      return acc;
    },
    {} as Record<number, typeof availabilityList>,
  );

  return (
    <SafeAreaView className="bg-background flex-1">
      <Stack.Screen options={{ title: "Availability" }} />
      <View className="h-full w-full">
        {editingId === null ? (
          <View className="flex-1">
            <View className="p-4">
              <Pressable
                onPress={() => setEditingId("new")}
                className="bg-primary rounded-md px-4 py-3"
              >
                <Text className="text-primary-foreground text-center text-base font-semibold">
                  Add Availability Window
                </Text>
              </Pressable>
            </View>

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
              <View className="flex-1 px-4">
                {DAYS_OF_WEEK.map((day, dayIndex) => {
                  const dayAvailability = availabilityByDay[dayIndex] ?? [];
                  if (dayAvailability.length === 0) return null;

                  return (
                    <View key={day} className="mb-4">
                      <Text className="text-foreground mb-2 text-lg font-semibold">
                        {day}
                      </Text>
                      {dayAvailability.map((item) => (
                        <View
                          key={item.id}
                          className="border-input bg-background mb-2 flex flex-row items-center justify-between rounded-md border px-4 py-3"
                        >
                          <Text className="text-foreground text-base">
                            {formatTimeRange(item.startTime, item.endTime)}
                          </Text>
                          <View className="flex flex-row gap-2">
                            <Pressable
                              onPress={() => setEditingId(item.id)}
                              className="border-input bg-background rounded-md border px-3 py-1"
                            >
                              <Text className="text-foreground text-sm">
                                Edit
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() =>
                                handleDelete(
                                  item.id,
                                  day,
                                  formatTimeRange(item.startTime, item.endTime),
                                )
                              }
                              disabled={deleteMutation.isPending}
                              className="border-destructive bg-background rounded-md border px-3 py-1"
                            >
                              <Text className="text-destructive text-sm">
                                Delete
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <AvailabilityForm
            onSubmit={(values) => {
              if (editingId === "new") {
                createMutation.mutate(values, {
                  onError: () => {
                    // Error handled by serverError prop
                  },
                });
              } else {
                updateMutation.mutate(
                  { id: editingId, ...values },
                  {
                    onError: () => {
                      // Error handled by serverError prop
                    },
                  },
                );
              }
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
            serverError={transformMutationError(
              createMutation.error ?? updateMutation.error,
            )}
            initialValues={
              editingId === "new"
                ? undefined
                : availabilityList.find((a) => a.id === editingId)
                  ? {
                      dayOfWeek: availabilityList.find(
                        (a) => a.id === editingId,
                      )?.dayOfWeek,
                      startTime: availabilityList
                        .find((a) => a.id === editingId)
                        ?.startTime.split(":")
                        .slice(0, 2)
                        .join(":"),
                      endTime: availabilityList
                        .find((a) => a.id === editingId)
                        ?.endTime.split(":")
                        .slice(0, 2)
                        .join(":"),
                    }
                  : undefined
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
