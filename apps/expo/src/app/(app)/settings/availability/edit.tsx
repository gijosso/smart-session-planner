import { useCallback, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { WeeklyAvailability } from "@ssp/api/client";
import { DAYS_OF_WEEK } from "@ssp/api/client";

import { Button, Card, ErrorScreen, LoadingScreen } from "~/components";
import { DAYS_OF_WEEK_DISPLAY } from "~/constants/activity";
import { useQueryErrorHandling } from "~/hooks/use-error-handling";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import {
  formatTimeFromFull,
  formatTimeToFull,
  isValidTimeFormat,
} from "~/utils/date";
import { toDayOfWeek } from "~/utils/type-guards";

export default function EditAvailability() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery(trpc.availability.get.queryOptions());
  const { data: availability, isLoading } = query;

  const errorHandling = useQueryErrorHandling(query, {
    title: "Unable to load availability",
  });

  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("17:00");

  const updateMutation = useMutation(
    trpc.availability.setWeekly.mutationOptions({
      onSuccess: (
        _data: unknown,
        _variables: { weeklyAvailability: WeeklyAvailability },
        _onMutateResult: unknown,
        _mutation: unknown,
      ) => {
        void queryClient.invalidateQueries(trpc.availability.get.queryFilter());
        toast.success("Availability updated successfully");
        router.back();
      },
      onError: (
        error: unknown,
        _variables: { weeklyAvailability: WeeklyAvailability },
        _onMutateResult: unknown,
        _mutation: unknown,
      ) => {
        createMutationErrorHandler({
          errorMessage: "Failed to update availability. Please try again.",
        })(error);
      },
    }),
  );

  const handleAddWindow = useCallback(
    (day: string) => {
      if (!availability) return;

      const dayOfWeek = toDayOfWeek(day);
      if (!dayOfWeek) {
        // Invalid day, should not happen but handle gracefully
        return;
      }

      // Validate time formats
      if (!isValidTimeFormat(newStartTime) || !isValidTimeFormat(newEndTime)) {
        toast.error(
          "Please enter a valid time format (HH:MM)",
          "Invalid Time Format",
        );
        return;
      }

      const currentWindows =
        dayOfWeek in availability.weeklyAvailability
          ? availability.weeklyAvailability[dayOfWeek]
          : [];
      const updatedWindows = [
        ...currentWindows,
        {
          startTime: formatTimeToFull(newStartTime),
          endTime: formatTimeToFull(newEndTime),
        },
      ].sort((a, b) => a.startTime.localeCompare(b.startTime));

      const updated: WeeklyAvailability = {
        ...availability.weeklyAvailability,
        [dayOfWeek]: updatedWindows,
      };

      updateMutation.mutate({ weeklyAvailability: updated });
    },
    [availability, newStartTime, newEndTime, updateMutation, toast],
  );

  const handleDeleteWindow = useCallback(
    (day: string, index: number) => {
      if (!availability) return;

      const dayOfWeek = toDayOfWeek(day);
      if (!dayOfWeek) {
        // Invalid day, should not happen but handle gracefully
        return;
      }

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

  if (errorHandling.hasError && errorHandling.error) {
    return (
      <>
        <Stack.Screen options={{ title: "Edit Availability" }} />
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
        <Stack.Screen options={{ title: "Edit Availability" }} />
        <ErrorScreen
          error={{
            code: "NOT_FOUND",
            message: "No availability data found",
            retryable: false,
          }}
          onReset={errorHandling.handleReset}
          title="Availability not found"
        />
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
                        key={`${window.startTime}-${window.endTime}`}
                        className="bg-muted flex flex-row items-center justify-between rounded-md p-3"
                      >
                        <Text className="text-foreground text-base">
                          {formatTimeFromFull(window.startTime)} -{" "}
                          {formatTimeFromFull(window.endTime)}
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
