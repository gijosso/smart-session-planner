import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { UpdateSessionForm } from "~/features/session/forms/update";
import { trpc } from "~/utils/api";
import { transformMutationError } from "~/utils/formik";
import { invalidateSessionQueriesForUpdate } from "~/utils/session-cache";

export default function UpdateSession() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: session,
    isLoading,
    error,
  } = useQuery(trpc.session.byId.queryOptions({ id }));

  const {
    mutate,
    error: mutationError,
    isPending,
  } = useMutation(trpc.session.update.mutationOptions());

  const handleSubmit = (values: {
    title?: string;
    type?: string;
    startTime?: Date;
    endTime?: Date;
    priority?: number;
    description?: string;
    completed?: boolean;
  }) => {
    if (!id || !session) return;

    // Convert Date objects to ISO strings for proper serialization
    const payload: {
      id: string;
      title?: string;
      type?: string;
      startTime?: string;
      endTime?: string;
      priority?: number;
      description?: string;
      completed?: boolean;
    } = {
      id,
    };

    if (values.title !== undefined) payload.title = values.title;
    if (values.type !== undefined) payload.type = values.type;
    if (values.description !== undefined)
      payload.description = values.description;
    if (values.completed !== undefined) payload.completed = values.completed;
    if (values.priority !== undefined) payload.priority = values.priority;
    if (values.startTime) payload.startTime = values.startTime.toISOString();
    if (values.endTime) payload.endTime = values.endTime.toISOString();

    mutate(payload as Parameters<typeof mutate>[0], {
      onSuccess() {
        // Invalidate queries based on old and new session dates
        const oldStartTime = session.startTime;
        const newStartTime = values.startTime ?? oldStartTime;

        invalidateSessionQueriesForUpdate(
          queryClient,
          {
            startTime: oldStartTime,
            id: session.id,
          },
          {
            startTime: newStartTime,
            id: session.id,
          },
        );

        // Navigate back to session detail
        router.back();
      },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Update Session" }} />
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (error || !session) {
    return (
      <SafeAreaView className="bg-background">
        <Stack.Screen options={{ title: "Update Session" }} />
        <View className="h-full w-full p-4">
          <Text className="text-destructive text-lg">
            {error?.message ?? "Session not found"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background">
      <Stack.Screen options={{ title: "Update Session" }} />
      <View className="h-full w-full">
        <UpdateSessionForm
          initialValues={{
            title: session.title,
            type: session.type,
            startTime: session.startTime,
            endTime: session.endTime,
            priority: session.priority,
            description: session.description,
          }}
          onSubmit={handleSubmit}
          isPending={isPending}
          serverError={transformMutationError(mutationError)}
        />
      </View>
    </SafeAreaView>
  );
}
