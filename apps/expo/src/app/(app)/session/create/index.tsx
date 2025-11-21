import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import {
  DEFAULT_PRIORITY,
  SUGGESTION_LOOK_AHEAD_DAYS,
} from "~/constants/app";
import { CreateSessionForm } from "~/features/session/forms";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { trpc } from "~/utils/api";
import {
  formatDateForInput,
  formatTimeForInput,
  safeToDate,
} from "~/utils/date";
import { transformMutationError } from "~/utils/formik";
import { invalidateSessionQueries } from "~/utils/session-cache";
import { toSessionType } from "~/utils/type-guards";
import { getSuggestionMutationOptions } from "~/utils/suggestion-id";

export default function CreateSession() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [resetKey, setResetKey] = useState(0);
  const params = useLocalSearchParams<{
    // Prefilled from suggestion
    title?: string;
    type?: string;
    suggestedStartTime?: string;
    suggestedEndTime?: string;
    priority?: string;
    description?: string;
    suggestionId?: string; // ID of the suggestion this session is being created from
  }>();

  // Validate route params using type guard
  const validatedType = params.type ? toSessionType(params.type) : undefined;

  const validatedPriority: number | undefined = params.priority
    ? (() => {
        const parsed = Number.parseInt(params.priority, 10);
        return !isNaN(parsed) && parsed >= 1 && parsed <= 5 ? parsed : undefined;
      })()
    : undefined;

  const {
    mutate,
    error: mutationError,
    isPending,
  } = useMutation(
    trpc.session.create.mutationOptions({
      ...getSuggestionMutationOptions(queryClient, {
        lookAheadDays: SUGGESTION_LOOK_AHEAD_DAYS,
      }),
      onSuccess(data) {
        // Trigger form reset
        setResetKey((prev) => prev + 1);

        // Invalidate queries based on session date (granular invalidation)
        invalidateSessionQueries(queryClient, {
          startTime: data.startTime,
          id: data.id,
        });

        // Navigate to the created session
        // Type-safe access - data should always have id from the API
        if (data.id) {
          router.replace(`/session/${data.id}`);
        } else {
          router.back();
        }
      },
      onError: createMutationErrorHandler({
        // Error is handled via serverError prop in form, so don't show alert
        showAlert: false,
      }),
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

  // Parse and validate prefilled values from route params
  const prefilledStartTime = safeToDate(params.suggestedStartTime);
  const prefilledEndTime = safeToDate(params.suggestedEndTime);

  // Use validated values, fallback to defaults if invalid
  const initialValues =
    prefilledStartTime && prefilledEndTime
      ? {
          title: params.title ?? "",
          type: validatedType ?? "OTHER",
          startDate: formatDateForInput(prefilledStartTime),
          startTime: formatTimeForInput(prefilledStartTime),
          endDate: formatDateForInput(prefilledEndTime),
          endTime: formatTimeForInput(prefilledEndTime),
          priority: validatedPriority ?? DEFAULT_PRIORITY,
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
