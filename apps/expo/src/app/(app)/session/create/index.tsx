import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { invalidateSessionQueries } from "~/utils/session-cache";

const SESSION_TYPES = [
  "Deep Work",
  "Workout",
  "Language",
  "Meditation",
  "Client Meeting",
  "Study",
  "Reading",
  "Other",
] as const;

export default function CreateSession() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");

  const { mutate, error, isPending } = useMutation(
    trpc.session.create.mutationOptions({
      onSuccess(data) {
        // Reset form
        setTitle("");
        setType("");
        setStartDate("");
        setStartTime("");
        setEndDate("");
        setEndTime("");
        setDescription("");

        // Invalidate queries based on session date (granular invalidation)
        invalidateSessionQueries(queryClient, {
          startTime: data.startTime,
          id: data.id,
        });

        // Navigate to the created session
        const sessionId = (data as { id?: string }).id;
        if (sessionId) {
          router.replace(`/session/${sessionId}`);
        } else {
          router.back();
        }
      },
    }),
  );

  const handleSubmit = () => {
    // Combine date and time strings into ISO format
    // Format: YYYY-MM-DD for date, HH:mm for time
    const startDateTime =
      startDate && startTime ? `${startDate}T${startTime}:00` : null;
    const endDateTime = endDate && endTime ? `${endDate}T${endTime}:00` : null;

    if (!title || !type || !startDateTime || !endDateTime) {
      return;
    }

    // Create Date objects - JavaScript will interpret these in local timezone
    // The API's z.coerce.date() will accept Date objects or ISO strings
    const startTimeDate = new Date(startDateTime);
    const endTimeDate = new Date(endDateTime);

    // Validate dates are valid
    if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
      return;
    }

    mutate({
      title,
      type,
      startTime: startTimeDate,
      endTime: endTimeDate,
      description: description || undefined,
    });
  };

  // Get today's date in YYYY-MM-DD format for default values
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Get current time in HH:mm format for default values
  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const isValid = title && type && startDate && startTime && endDate && endTime;

  return (
    <SafeAreaView className="bg-background">
      <View className="h-full w-full">
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={true}
          className="flex-1"
        >
          <View className="mb-4">
            <Text className="text-foreground mb-2 text-sm font-medium">
              Title *
            </Text>
            <TextInput
              className="border-input bg-background text-foreground rounded-md border px-3 py-2 text-base"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Morning Meditation"
              maxLength={256}
            />
            {error?.data?.zodError?.fieldErrors.title && (
              <Text className="text-destructive mt-1 text-sm">
                {error.data.zodError.fieldErrors.title}
              </Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-foreground mb-2 text-sm font-medium">
              Type *
            </Text>
            <View className="flex flex-row flex-wrap gap-2">
              {SESSION_TYPES.map((sessionType) => (
                <Pressable
                  key={sessionType}
                  onPress={() => setType(sessionType)}
                  className={`rounded-md border px-3 py-2 ${
                    type === sessionType
                      ? "bg-primary border-primary"
                      : "border-input bg-background"
                  }`}
                >
                  <Text
                    className={
                      type === sessionType
                        ? "text-primary-foreground text-sm font-medium"
                        : "text-foreground text-sm"
                    }
                  >
                    {sessionType}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              className="border-input bg-background text-foreground mt-2 rounded-md border px-3 py-2 text-base"
              value={type}
              onChangeText={setType}
              placeholder="Or enter custom type"
              maxLength={100}
            />
            {error?.data?.zodError?.fieldErrors.type && (
              <Text className="text-destructive mt-1 text-sm">
                {error.data.zodError.fieldErrors.type}
              </Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-foreground mb-2 text-sm font-medium">
              Start Date & Time *
            </Text>
            <View className="flex flex-row gap-2">
              <View className="flex-1">
                <TextInput
                  className="border-input bg-background text-foreground rounded-md border px-3 py-2 text-base"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder={getTodayDate()}
                  placeholderTextColor="#71717A"
                />
                <Text className="text-muted-foreground mt-1 text-xs">
                  Format: YYYY-MM-DD
                </Text>
              </View>
              <View className="flex-1">
                <TextInput
                  className="border-input bg-background text-foreground rounded-md border px-3 py-2 text-base"
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder={getCurrentTime()}
                  placeholderTextColor="#71717A"
                />
                <Text className="text-muted-foreground mt-1 text-xs">
                  Format: HH:mm (24h)
                </Text>
              </View>
            </View>
            {error?.data?.zodError?.fieldErrors.startTime && (
              <Text className="text-destructive mt-1 text-sm">
                {error.data.zodError.fieldErrors.startTime}
              </Text>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-foreground mb-2 text-sm font-medium">
              End Date & Time *
            </Text>
            <View className="flex flex-row gap-2">
              <View className="flex-1">
                <TextInput
                  className="border-input bg-background text-foreground rounded-md border px-3 py-2 text-base"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder={getTodayDate()}
                  placeholderTextColor="#71717A"
                />
                <Text className="text-muted-foreground mt-1 text-xs">
                  Format: YYYY-MM-DD
                </Text>
              </View>
              <View className="flex-1">
                <TextInput
                  className="border-input bg-background text-foreground rounded-md border px-3 py-2 text-base"
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder={getCurrentTime()}
                  placeholderTextColor="#71717A"
                />
                <Text className="text-muted-foreground mt-1 text-xs">
                  Format: HH:mm (24h)
                </Text>
              </View>
            </View>
            {error?.data?.zodError?.fieldErrors.endTime && (
              <Text className="text-destructive mt-1 text-sm">
                {error.data.zodError.fieldErrors.endTime}
              </Text>
            )}
          </View>

          <View className="mb-6">
            <Text className="text-foreground mb-2 text-sm font-medium">
              Description
            </Text>
            <TextInput
              className="border-input bg-background text-foreground rounded-md border px-3 py-2 text-base"
              value={description}
              onChangeText={setDescription}
              placeholder="Optional notes or description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {error?.data?.zodError?.fieldErrors.description && (
              <Text className="text-destructive mt-1 text-sm">
                {error.data.zodError.fieldErrors.description}
              </Text>
            )}
          </View>

          {error?.data?.code === "UNAUTHORIZED" && (
            <Text className="text-destructive mb-4 text-center">
              You need to be logged in to create a session
            </Text>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={!isValid || isPending}
            className={`rounded-md px-4 py-3 ${
              isValid && !isPending ? "bg-primary" : "bg-muted opacity-50"
            }`}
          >
            <Text
              className={`text-center text-base font-semibold ${
                isValid && !isPending
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {isPending ? "Creating..." : "Create Session"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
