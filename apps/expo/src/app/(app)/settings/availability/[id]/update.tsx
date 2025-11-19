import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AvailabilityForm } from "~/features/availability/forms/availability-form";
import { trpc } from "~/utils/api";
import { transformMutationError } from "~/utils/formik";

export default function UpdateAvailability() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: availability,
    isLoading,
    error,
  } = useQuery(trpc.availability.all.queryOptions());

  const updateMutation = useMutation(
    trpc.availability.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.availability.all.queryFilter());
        router.back();
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.availability.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.availability.all.queryFilter());
        router.back();
      },
    }),
  );

  if (isLoading) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Update Availability" }} />
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (error || !availability) {
    return (
      <SafeAreaView className="bg-background">
        <Stack.Screen options={{ title: "Update Availability" }} />
        <View className="h-full w-full p-4">
          <Text className="text-destructive text-lg">
            {error?.message ?? "Error loading availability"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const availabilityItem = availability.find((a) => a.id === id);

  if (!availabilityItem) {
    return (
      <SafeAreaView className="bg-background">
        <Stack.Screen options={{ title: "Update Availability" }} />
        <View className="h-full w-full p-4">
          <Text className="text-destructive text-lg">
            Availability not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background">
      <Stack.Screen options={{ title: "Update Availability" }} />
      <View className="flex w-full flex-col gap-4">
        <View className="flex flex-row items-center justify-between">
          <AvailabilityForm
            onSubmit={(values) => {
              updateMutation.mutate(
                {
                  id,
                  dayOfWeek: values.dayOfWeek,
                  startTime: values.startTime,
                  endTime: values.endTime,
                },
                {
                  onError: () => {
                    // Error handled by serverError prop
                  },
                },
              );
            }}
            isPending={updateMutation.isPending}
            serverError={transformMutationError(updateMutation.error)}
            initialValues={{
              dayOfWeek: availabilityItem.dayOfWeek,
              startTime: availabilityItem.startTime
                .split(":")
                .slice(0, 2)
                .join(":"),
              endTime: availabilityItem.endTime
                .split(":")
                .slice(0, 2)
                .join(":"),
            }}
          />
        </View>
        <Pressable
          onPress={() => deleteMutation.mutate({ id })}
          className="bg-destructive rounded-md px-4 py-3"
        >
          <Text className="text-destructive text-base font-medium underline">
            Delete
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
