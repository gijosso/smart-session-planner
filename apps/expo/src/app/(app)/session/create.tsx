import { useCallback } from "react";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SessionType } from "@ssp/api/client";

import { BackButtonTitle, Content, Screen } from "~/components";
import { CreateSessionForm } from "~/features/session/forms/session-form";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { transformMutationError } from "~/utils/form";
import { invalidateSessionQueries } from "~/utils/sessions/session-cache";

export default function CreateSession() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const createMutation = useMutation(
    trpc.session.create.mutationOptions({
      onSuccess: (data) => {
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
        />
      </Content>
    </Screen>
  );
}
