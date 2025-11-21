import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { router, useGlobalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import { Content, ErrorScreen, LoadingScreen, Screen } from "~/components";
import { BackButton } from "~/components/layout/back-button";
import { UpdateSessionForm } from "~/features/session/forms/session-form";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useQueryError } from "~/hooks/use-query-error";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { transformMutationError } from "~/utils/form";
import {
  invalidateSessionQueries,
  invalidateSessionQueriesForUpdate,
} from "~/utils/sessions/session-cache";

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
      onMutate: (variables) => {
        // Capture current session data before update
        const queryOptions = trpc.session.byId.queryOptions({
          id: variables.id,
        });
        const oldSession = queryClient.getQueryData(queryOptions.queryKey);
        return { oldSession };
      },
      onSuccess: (data, _variables, context) => {
        const oldSession = context.oldSession;
        if (oldSession) {
          invalidateSessionQueriesForUpdate(
            queryClient,
            {
              startTime: oldSession.startTime,
              id: oldSession.id,
            },
            {
              startTime: data.startTime,
              id: data.id,
            },
          );
        } else {
          invalidateSessionQueries(queryClient, {
            startTime: data.startTime,
            id: data.id,
          });
        }
        toast.success("Session updated successfully");
        router.back();
      },
      onError: createMutationErrorHandler({
        errorMessage: "Failed to update session. Please try again.",
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
        <View className="flex flex-row items-center gap-2">
          <BackButton />
          <Text className="text-foreground text-2xl">Edit Session</Text>
        </View>
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
