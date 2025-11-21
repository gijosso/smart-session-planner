import { useCallback, useMemo } from "react";
import { router, useGlobalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import { BackButtonTitle } from "~/components/layout/back-button-title";
import { Content } from "~/components/layout/content";
import { ErrorScreen } from "~/components/error/error-screen";
import { LoadingScreen } from "~/components/layout/loading-screen";
import { Screen } from "~/components/layout/screen";
import { UpdateSessionForm } from "~/features/session/forms/session-form";
import { getSessionUpdateMutationOptions } from "~/features/session/use-session-mutation";
import { useQueryError } from "~/hooks/use-query-error";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { transformMutationError } from "~/utils/form";

export default function EditSession() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    data: session,
    isLoading,
    error,
  } = useQuery(trpc.session.byId.queryOptions({ id }));
  const queryError = useQueryError({ error });

  const updateMutation = useMutation(
    trpc.session.update.mutationOptions({
      ...getSessionUpdateMutationOptions(queryClient, {
        errorMessage: "Failed to update session. Please try again.",
        onSuccess: () => {
          toast.success("Session updated successfully");
          router.back();
        },
      }),
    }),
  );

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
      if (!id) return;

      const updateData: {
        id: string;
        title?: string;
        type?: SessionType;
        startTime?: Date;
        endTime?: Date;
        priority?: number;
        description?: string;
        completed?: boolean;
        allowConflicts?: boolean;
      } = {
        id,
        allowConflicts: false,
      };

      if (values.title !== undefined) updateData.title = values.title;
      if (values.type !== undefined) updateData.type = values.type;
      if (values.startTime !== undefined)
        updateData.startTime = values.startTime;
      if (values.endTime !== undefined) updateData.endTime = values.endTime;
      if (values.priority !== undefined) updateData.priority = values.priority;
      if (values.description !== undefined)
        updateData.description = values.description;
      if (values.completed !== undefined)
        updateData.completed = values.completed;

      updateMutation.mutate(updateData);
    },
    [id, updateMutation],
  );

  const handleRetry = useCallback(() => {
    void queryClient.invalidateQueries(trpc.session.byId.queryFilter({ id }));
  }, [id, queryClient]);

  const handleReset = useCallback(() => {
    router.back();
  }, []);

  const formattedInitialValues = useMemo(() => {
    if (!session) return undefined;
    return {
      title: session.title,
      type: session.type,
      startTime: session.startTime,
      endTime: session.endTime,
      priority: session.priority,
      description: session.description ?? undefined,
    };
  }, [session]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (queryError.hasError && queryError.error) {
    return (
      <ErrorScreen
        error={queryError.error}
        onRetry={handleRetry}
        onReset={handleReset}
        title="Unable to load session"
      />
    );
  }

  if (!session || !formattedInitialValues) {
    return (
      <ErrorScreen
        error={{
          code: "NOT_FOUND",
          message: "Session not found",
          retryable: false,
        }}
        onReset={handleReset}
        title="Session not found"
      />
    );
  }

  return (
    <Screen backButton variant="default">
      <Content className="gap-8">
        <BackButtonTitle title="Edit Session" />
        <UpdateSessionForm
          initialValues={formattedInitialValues}
          onSubmit={handleSubmit}
          isPending={updateMutation.isPending}
          serverError={transformMutationError(updateMutation.error)}
        />
      </Content>
    </Screen>
  );
}
