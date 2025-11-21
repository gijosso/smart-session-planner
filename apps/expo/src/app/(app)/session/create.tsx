import { useCallback, useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";
import type { SessionFormValues } from "@ssp/validators";

import { BackButtonTitle } from "~/components/layout/back-button-title";
import { Content } from "~/components/layout/content";
import { LoadingScreen } from "~/components/layout/loading-screen";
import { Screen } from "~/components/layout/screen";
import { CreateSessionForm } from "~/features/session/forms/session-form";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { formatDateForInput, formatTimeForInput } from "~/utils/date";
import { transformMutationError } from "~/utils/form";
import { invalidateSessionQueries } from "~/utils/sessions/session-cache";

export default function CreateSession() {
  const params = useLocalSearchParams<{
    title?: string;
    type?: SessionType;
    startTime?: string;
    endTime?: string;
    priority?: string;
    description?: string;
  }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const createMutation = useMutation(
    trpc.session.create.mutationOptions({
      onSuccess: (data) => {
        // Invalidate queries based on the new session's date (granular invalidation)
        invalidateSessionQueries(queryClient, {
          startTime: data.startTime,
          id: data.id,
        });
        toast.success("Session created successfully");
        router.back();
      },
      onError: createMutationErrorHandler({
        errorMessage: "Failed to create session. Please try again.",
      }),
    }),
  );

  // Convert query params to initial values for the form
  const initialValues = useMemo<Partial<SessionFormValues> | undefined>(() => {
    if (!params.startTime || !params.endTime) {
      return undefined;
    }

    const startTime = new Date(params.startTime);
    const endTime = new Date(params.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return undefined;
    }

    return {
      title: params.title ?? "",
      type: params.type,
      startDate: formatDateForInput(startTime),
      startTime: formatTimeForInput(startTime),
      endDate: formatDateForInput(endTime),
      endTime: formatTimeForInput(endTime),
      priority: params.priority ? parseInt(params.priority, 10) : undefined,
      description: params.description ?? "",
    };
  }, [params]);

  const handleSubmit = useCallback(
    (values: {
      title: string;
      type: SessionType;
      startTime: Date;
      endTime: Date;
      priority: number;
      description?: string;
    }) => {
      createMutation.mutate({
        title: values.title,
        type: values.type,
        startTime: values.startTime,
        endTime: values.endTime,
        priority: values.priority,
        description: values.description ?? undefined,
        allowConflicts: false,
      });
    },
    [createMutation],
  );

  return (
    <Screen backButton variant="default">
      <Content className="gap-8">
        <BackButtonTitle title="Create Session" />
        <CreateSessionForm
          onSubmit={handleSubmit}
          isPending={createMutation.isPending}
          serverError={transformMutationError(createMutation.error)}
          initialValues={initialValues}
        />
      </Content>
    </Screen>
  );
}
