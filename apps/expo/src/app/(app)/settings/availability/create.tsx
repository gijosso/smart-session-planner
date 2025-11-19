import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AvailabilityForm } from "~/features/availability/forms/availability-form";
import { trpc } from "~/utils/api";
import { transformMutationError } from "~/utils/formik";

export default function CreateAvailability() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.availability.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.availability.all.queryFilter());
        router.back();
      },
    }),
  );

  return (
    <SafeAreaView className="bg-background flex-1">
      <Stack.Screen options={{ title: "Create Availability" }} />
      <View className="h-full w-full">
        <AvailabilityForm
          onSubmit={(values) => {
            createMutation.mutate(
              {
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
          isPending={createMutation.isPending}
          serverError={transformMutationError(createMutation.error)}
        />
      </View>
    </SafeAreaView>
  );
}
