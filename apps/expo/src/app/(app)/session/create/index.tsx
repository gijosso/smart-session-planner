import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import { CreateSessionForm } from "~/features/session/forms/create";
import { trpc } from "~/utils/api";
import {
  formatDateForInput,
  formatTimeForInput,
  safeToDate,
} from "~/utils/date";
import { transformMutationError } from "~/utils/formik";
import { invalidateSessionQueries } from "~/utils/session-cache";

export default function CreateSession() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [resetKey, setResetKey] = useState(0);
  const params = useLocalSearchParams<{
    // Prefilled from suggestion
    title?: string;
    type?: SessionType;
    suggestedStartTime?: string;
    suggestedEndTime?: string;
    priority?: string;
    description?: string;
    suggestionId?: string; // ID of the suggestion this session is being created from
    // Legacy params (for backwards compatibility)
    durationMinutes?: string;
  }>();

  const {
    mutate,
    error: mutationError,
    isPending,
  } = useMutation(
    trpc.session.create.mutationOptions({
      onSuccess(data) {
        // Trigger form reset
        setResetKey((prev) => prev + 1);

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

  const handleSubmit = (values: {
    title: string;
    type: SessionType;
    startTime: Date;
    endTime: Date;
    priority: number;
    description?: string;
  }) => {
    mutate({
      title: values.title,
      type: values.type,
      startTime: values.startTime.toISOString(),
      endTime: values.endTime.toISOString(),
      priority: values.priority,
      description: values.description,
      ...(params.suggestionId && { fromSuggestionId: params.suggestionId }),
    });
  };

  // Parse prefilled values from route params
  const prefilledStartTime = safeToDate(params.suggestedStartTime);
  const prefilledEndTime = safeToDate(params.suggestedEndTime);
  const prefilledPriority = params.priority
    ? Number.parseInt(params.priority, 10)
    : undefined;

  const initialValues =
    prefilledStartTime && prefilledEndTime
      ? {
          title: params.title ?? "",
          type: params.type ?? "OTHER",
          startDate: formatDateForInput(prefilledStartTime),
          startTime: formatTimeForInput(prefilledStartTime),
          endDate: formatDateForInput(prefilledEndTime),
          endTime: formatTimeForInput(prefilledEndTime),
          priority: prefilledPriority ?? 3,
          description: params.description ?? "",
        }
      : undefined;

  return (
    <SafeAreaView className="bg-background">
      <View className="h-full w-full">
        <CreateSessionForm
          key={resetKey}
          onSubmit={handleSubmit}
          isPending={isPending}
          serverError={transformMutationError(mutationError)}
          initialValues={initialValues}
        />
      </View>
    </SafeAreaView>
  );
}
