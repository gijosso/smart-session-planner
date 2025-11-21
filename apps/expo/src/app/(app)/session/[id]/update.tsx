import { useCallback } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import { Button } from "~/components";
import { UpdateSessionForm } from "~/features/session";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { transformMutationError } from "~/utils/formik";
import { invalidateSessionQueriesForUpdate } from "~/utils/sessions/session-cache";

export default function UpdateSession() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const isValidId = typeof id === "string" && id.trim() !== "";

  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    ...trpc.session.byId.queryOptions({ id }),
    enabled: isValidId,
  });

  const {
    mutate,
    error: mutationError,
    isPending,
  } = useMutation(
    trpc.session.update.mutationOptions({
      onMutate: (variables) => {
        // Capture current session data before update (React Query pattern)
        const queryOptions = trpc.session.byId.queryOptions({
          id: variables.id,
        });
        const oldSession = queryClient.getQueryData(queryOptions.queryKey);
        return { oldSession };
      },
      onSuccess: (_data, variables, context) => {
        // Use React Query's getQueryData to get latest session (may have been updated)
        const queryOptions = trpc.session.byId.queryOptions({
          id: variables.id,
        });
        const latestSession =
          queryClient.getQueryData(queryOptions.queryKey) ?? context.oldSession;

        if (!latestSession) return;

        const newStartTime =
          variables.startTime && typeof variables.startTime === "string"
            ? new Date(variables.startTime)
            : undefined;

        const oldStartTime =
          context.oldSession?.startTime &&
          (typeof context.oldSession.startTime === "string" ||
            context.oldSession.startTime instanceof Date)
            ? context.oldSession.startTime
            : latestSession.startTime;
        const finalNewStartTime = newStartTime ?? oldStartTime;

        invalidateSessionQueriesForUpdate(
          queryClient,
          {
            startTime: oldStartTime,
            id: latestSession.id,
          },
          {
            startTime: finalNewStartTime,
            id: latestSession.id,
          },
        );

        toast.success("Session updated successfully");
        router.back();
      },
      onError: createMutationErrorHandler({
        // Error is handled via serverError prop in form, so don't show alert
        showAlert: false,
      }),
    }),
  );

  if (!isValidId) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "Update Session" }} />
        <View className="h-full w-full p-4">
          <Text className="text-destructive text-lg">
            Invalid session ID. Please go back and try again.
          </Text>
          <Button
            variant="outline"
            onPress={handleGoBack}
            className="mt-4"
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = useCallback(
    (values: {
      title?: string;
      type?: SessionType;
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
        type?: SessionType;
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

      mutate(payload as Parameters<typeof mutate>[0]);
    },
    [id, session, mutate],
  );

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

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
