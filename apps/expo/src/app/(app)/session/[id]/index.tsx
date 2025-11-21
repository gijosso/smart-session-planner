import { useCallback, useMemo } from "react";
import { Alert, Text, View } from "react-native";
import { router, useGlobalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BackButtonTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CompletedIndicator,
  ErrorScreen,
  LoadingScreen,
  PriorityIndicator,
  Screen,
  SessionTypeIcon,
  TimeDisplay,
} from "~/components";
import { Content } from "~/components/layout/content";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import {
  getSessionDeleteMutationOptions,
  getSessionMutationOptions,
} from "~/features/session/use-session-mutation";
import { useErrorHandling } from "~/hooks/use-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import {
  formatDateDisplay,
  formatTimeRange,
} from "~/utils/suggestions/suggestion-formatting";

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

  // handleRetry and handleReset are provided by useErrorHandling

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Session",
      `Are you sure you want to delete "${session?.title}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (id) {
              deleteMutation.mutate({ id });
            }
          },
        },
      ],
    );
  }, [session?.title, id, deleteMutation]);

  const handleEdit = useCallback(() => {
    if (id) {
      router.push(`/session/${id}/edit`);
    }
  }, [id]);

  const formattedDate = useMemo(
    () => formatDateDisplay(session?.startTime ?? new Date()),
    [session?.startTime],
  );

  const formattedTimeRange = useMemo(
    () =>
      formatTimeRange(
        session?.startTime ?? new Date(),
        session?.endTime ?? new Date(),
      ),
    [session?.startTime, session?.endTime],
  );

  const sessionTypeLabel = useMemo(
    () => SESSION_TYPES_DISPLAY[session?.type ?? "OTHER"].label,
    [session?.type],
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
            <View className="flex flex-1 flex-row items-center justify-end">
              <PriorityIndicator priority={session.priority} />
            </View>

            <View className="flex flex-1 flex-row items-center gap-4">
              <SessionTypeIcon type={session.type} iconSize={22} />

              <Text
                className="text-foreground text-xl font-semibold"
                accessibilityRole="text"
              >
                {sessionTypeLabel}
              </Text>
            </View>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col justify-center gap-4">
            <TimeDisplay
              timeRange={formattedTimeRange}
              date={formattedDate}
              showSeparator={true}
            />

            {session.description && (
              <Text className="text-secondary-foreground" numberOfLines={3}>
                {session.description}.
              </Text>
            )}
          </CardContent>

          <CardFooter className="flex flex-row gap-4">
            <Button className="flex-1" variant="outline" onPress={handleEdit}>
              Edit
            </Button>
            <Button
              variant="destructive"
              onPress={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </CardFooter>
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
