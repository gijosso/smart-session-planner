import { useCallback, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DayOfWeek, WeeklyAvailability } from "@ssp/api/client";
import { DAYS_OF_WEEK } from "@ssp/api/client";

import { Button, Card, LoadingScreen } from "~/components";
import { DAYS_OF_WEEK_DISPLAY } from "~/constants/activity";
import { trpc } from "~/utils/api";

/**
 * Formats time from HH:MM:SS to HH:MM
 */
function formatTime(time: string): string {
  return time.split(":").slice(0, 2).join(":");
}

/**
 * Converts HH:MM to HH:MM:SS
 */
function toFullTime(time: string): string {
  return `${time}:00`;
}

export default function EditAvailability() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: availability,
    isLoading,
    error,
  } = useQuery(trpc.availability.get.queryOptions());

  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("17:00");

  const updateMutation = useMutation(
    trpc.availability.setWeekly.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.availability.get.queryFilter());
        router.back();
      },
    }),
  );

  const handleAddWindow = useCallback(
    (day: string) => {
      if (!availability) return;

      const dayOfWeek = day as DayOfWeek;
      const currentWindows =
        dayOfWeek in availability.weeklyAvailability
          ? availability.weeklyAvailability[dayOfWeek]
          : [];
      const updatedWindows = [
        ...currentWindows,
        {
          startTime: toFullTime(newStartTime),
          endTime: toFullTime(newEndTime),
        },
      ].sort((a, b) => a.startTime.localeCompare(b.startTime));

      const updated: WeeklyAvailability = {
        ...availability.weeklyAvailability,
        [dayOfWeek]: updatedWindows,
      };

      updateMutation.mutate({ weeklyAvailability: updated });
    },
    [availability, newStartTime, newEndTime, updateMutation],
  );

  const handleDeleteWindow = useCallback(
    (day: string, index: number) => {
      if (!availability) return;

      const dayOfWeek = day as DayOfWeek;
      const currentWindows =
        dayOfWeek in availability.weeklyAvailability
          ? availability.weeklyAvailability[dayOfWeek]
          : [];
      const updatedWindows = currentWindows.filter(
        (_: unknown, i: number) => i !== index,
      );

      const updated: WeeklyAvailability = {
        ...availability.weeklyAvailability,
      };

      if (updatedWindows.length > 0) {
        updated[dayOfWeek] = updatedWindows;
      } else {
        // Remove day if no windows left
        delete updated[dayOfWeek];
      }

      updateMutation.mutate({ weeklyAvailability: updated });
    },
    [availability, updateMutation],
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Edit Availability" }} />
        <LoadingScreen />
      </>
    );
  }

  if (error || !availability) {
    return (
      <SafeAreaView className="bg-background">
        <Stack.Screen options={{ title: "Edit Availability" }} />
        <View className="h-full w-full p-4">
          <Text className="text-destructive text-lg">
            {error?.message ?? "Error loading availability"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1">
      <Stack.Screen options={{ title: "Edit Availability" }} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {DAYS_OF_WEEK.map((day) => {
            const windows =
              day in availability.weeklyAvailability
                ? availability.weeklyAvailability[day]
                : [];
            const isEditing = editingDay === day;

            return (
              <Card key={day} variant="outline" className="mb-4">
                <View className="mb-3 flex flex-row items-center justify-between">
                  <Text className="text-foreground text-lg font-semibold">
                    {DAYS_OF_WEEK_DISPLAY[day].label}
                  </Text>
                  <Button
                    variant="default"
                    size="sm"
                    onPress={() => setEditingDay(isEditing ? null : day)}
                  >
                    {isEditing
                      ? "Cancel"
                      : windows.length === 0
                        ? "Add"
                        : "Edit"}
                  </Button>
                </View>

                {windows.length > 0 && (
                  <View className="mb-3 flex flex-col gap-2">
                    {windows.map((window, index) => (
                      <View
                        key={index}
                        className="bg-muted flex flex-row items-center justify-between rounded-md p-3"
                      >
                        <Text className="text-foreground text-base">
                          {formatTime(window.startTime)} -{" "}
                          {formatTime(window.endTime)}
                        </Text>
                        <Button
                          variant="destructive"
                          size="sm"
                          onPress={() => handleDeleteWindow(day, index)}
                        >
                          Delete
                        </Button>
                      </View>
                    ))}
                  </View>
                )}

                {isEditing && (
                  <View className="border-border flex flex-col gap-3 border-t pt-3">
                    <View>
                      <Text className="text-foreground mb-2 text-sm font-medium">
                        Start Time
                      </Text>
                      <TextInput
                        className="border-input bg-background text-foreground rounded-md border px-3 py-2 text-base"
                        value={newStartTime}
                        onChangeText={setNewStartTime}
                        placeholder="09:00"
                        placeholderTextColor="#71717A"
                      />
                    </View>
                    <View>
                      <Text className="text-foreground mb-2 text-sm font-medium">
                        End Time
                      </Text>
                      <TextInput
                        className="border-input bg-background text-foreground rounded-md border px-3 py-2 text-base"
                        value={newEndTime}
                        onChangeText={setNewEndTime}
                        placeholder="17:00"
                        placeholderTextColor="#71717A"
                      />
                    </View>
                    <Button
                      variant="default"
                      onPress={() => {
                        handleAddWindow(day);
                        setEditingDay(null);
                        setNewStartTime("09:00");
                        setNewEndTime("17:00");
                      }}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Adding..." : "Add Window"}
                    </Button>
                  </View>
                )}
              </Card>
            );
          })}

          <Button
            variant="secondary"
            onPress={() => {
              router.back();
            }}
            className="mt-4"
          >
            Done
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
