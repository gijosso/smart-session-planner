import { useCallback } from "react";
import { View } from "react-native";
import { router, useGlobalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BackButtonTitle,
  Button,
  Card,
  CardHeader,
  CompletedIndicator,
  ErrorScreen,
  LoadingScreen,
  Screen,
} from "~/components";
import { Content } from "~/components/layout/content";
import {
  SessionActions,
  SessionDetails,
  SessionHeader,
} from "~/features/session/session-detail";
import {
  getSessionDeleteMutationOptions,
  getSessionMutationOptions,
} from "~/features/session/use-session-mutation";
import { useErrorHandling } from "~/hooks/use-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";

export default function Session() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const sessionQuery = useQuery(trpc.session.byId.queryOptions({ id }));
  const { data: session, isLoading } = sessionQuery;
  const { error, hasError, handleRetry, handleReset } = useErrorHandling({
    query: sessionQuery,
    title: "Failed to load session",
  });

  const toggleCompleteMutation = useMutation(
    trpc.session.toggleComplete.mutationOptions({
      ...getSessionMutationOptions(queryClient, {
        // Toggling completion doesn't affect stats (they're already calculated)
        invalidateStats: false,
        errorMessage: "Failed to update session. Please try again.",
        onSuccess: (data) => {
          // Check if session is now complete (completedAt is not null)
          if (data) {
            const isComplete = data.completedAt !== null;
            toast.success(
              isComplete
                ? "Session marked as complete"
                : "Session marked as incomplete",
            );
          }
        },
      }),
    }),
  );

  const deleteMutation = useMutation(
    trpc.session.delete.mutationOptions({
      ...getSessionDeleteMutationOptions(queryClient, {
        errorMessage: "Failed to delete session. Please try again.",
        onSuccess: () => {
          toast.success("Session deleted successfully");
          router.replace("/home");
        },
      }),
    }),
  );

  const handleToggleComplete = useCallback(() => {
    if (id) {
      toggleCompleteMutation.mutate({ id });
    }
  }, [id, toggleCompleteMutation]);

  const handleDelete = useCallback(
    (sessionId: string) => {
      if (sessionId) {
        deleteMutation.mutate({ id: sessionId });
      }
    },
    [deleteMutation],
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (hasError && error) {
    return (
      <ErrorScreen
        error={error}
        onRetry={handleRetry}
        onReset={handleReset}
        title="Unable to load session"
      />
    );
  }

  if (!session) {
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
        <BackButtonTitle title={session.title}>
          {session.completed && <CompletedIndicator />}
        </BackButtonTitle>

        <Card>
          <CardHeader>
            <SessionHeader type={session.type} priority={session.priority} />
          </CardHeader>

          <SessionDetails
            startTime={session.startTime}
            endTime={session.endTime}
            description={session.description}
          />

          <SessionActions
            sessionId={id}
            sessionTitle={session.title}
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
          />
        </Card>
      </Content>

      <View className="flex-1" />

      <Content>
        <Button
          variant={session.completed ? "secondary" : "default"}
          size="lg"
          onPress={handleToggleComplete}
          disabled={toggleCompleteMutation.isPending}
        >
          {toggleCompleteMutation.isPending
            ? "Updating..."
            : session.completed
              ? "Mark as Incomplete"
              : "Mark as Complete"}
        </Button>
      </Content>
    </Screen>
  );
}
