import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { CreateSessionForm } from "~/features/session/forms/session-form";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { transformMutationError } from "~/utils/form";
import { invalidateSessionQueries } from "~/utils/sessions/session-cache";
import { Screen } from "~/components";

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
      type: string;
      startTime: Date;
      endTime: Date;
      priority: number;
      description?: string;
    }) => {
      createMutation.mutate({
        title: values.title,
        type: values.type as any,
        startTime: values.startTime,
        endTime: values.endTime,
        priority: values.priority,
        description: values.description,
        allowConflicts: false,
      });
    },
    [createMutation],
  );

  return (
    <Screen backButton variant="default">
      <CreateSessionForm
        onSubmit={handleSubmit}
        isPending={createMutation.isPending}
        serverError={transformMutationError(createMutation.error)}
      />
    </Screen>
  );
}

