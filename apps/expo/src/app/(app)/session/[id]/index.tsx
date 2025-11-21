import { useCallback } from "react";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useGlobalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, ErrorScreen, LoadingScreen } from "~/components";
import { PRIORITY_LEVELS } from "~/constants/app";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useQueryError } from "~/hooks/use-query-error";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { formatDateForDisplay, formatTimeRange } from "~/utils/date";
import { invalidateSessionQueries } from "~/utils/sessions/session-cache";

export default function Session() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error } = useQuery(
    trpc.session.byId.queryOptions({ id }),
  );
  const queryError = useQueryError({ error });

  const toggleCompleteMutation = useMutation(
    trpc.session.toggleComplete.mutationOptions({
      onMutate: (variables) => {
        // Capture current session data before toggle (React Query pattern)
        const queryOptions = trpc.session.byId.queryOptions({
          id: variables.id,
        });
        const oldSession = queryClient.getQueryData(queryOptions.queryKey);
        return { oldSession };
      },
      onSuccess: (data) => {
        // Use the response data from the mutation (always defined)
        invalidateSessionQueries(queryClient, {
          startTime: data.startTime,
          id: data.id,
        });

        // Check if session is now complete (completedAt is not null)
        const isComplete = data.completedAt !== null;
        toast.success(
          isComplete
            ? "Session marked as complete"
            : "Session marked as incomplete",
        );
      },
      onError: createMutationErrorHandler({
        errorMessage: "Failed to update session. Please try again.",
      }),
    }),
  );

  const deleteMutation = useMutation(
    trpc.session.delete.mutationOptions({
      onMutate: (variables) => {
        // Capture current session data before deletion (React Query pattern)
        const queryOptions = trpc.session.byId.queryOptions({
          id: variables.id,
        });
        const currentSession = queryClient.getQueryData(queryOptions.queryKey);
        return { sessionData: currentSession };
      },
      onSuccess: (_data, _variables, context) => {
        // Use context to get session data captured in onMutate (avoids stale closure)
        const sessionData = context.sessionData;

        if (id) {
          queryClient.removeQueries(trpc.session.byId.queryFilter({ id }));
        }

        if (sessionData) {
          invalidateSessionQueries(queryClient, {
            startTime: sessionData.startTime,
          });
        }
        toast.success("Session deleted successfully");
        router.replace("/home");
      },
      onError: createMutationErrorHandler({
        errorMessage: "Failed to delete session. Please try again.",
      }),
    }),
  );

  const handleToggleComplete = useCallback(() => {
    if (data?.id) {
      toggleCompleteMutation.mutate({ id: data.id });
    }
  }, [data?.id, toggleCompleteMutation]);

  const handleUpdate = useCallback(() => {
    if (id) {
      router.push(`/session/${id}/update`);
    }
  }, [id]);

  const handleRetry = useCallback(() => {
    void queryClient.invalidateQueries(trpc.session.byId.queryFilter({ id }));
  }, [id, queryClient]);

  const handleReset = useCallback(() => {
    router.back();
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Session",
      `Are you sure you want to delete "${data?.title}"? This action cannot be undone.`,
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
  }, [data?.title, id, deleteMutation]);

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

  if (!data) {
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
    <SafeAreaView className="bg-background flex-1">
      <Stack.Screen options={{ title: data.title }} />
      <View className="h-full w-full p-4">
        <View className="mb-6">
          <View className="mb-2 flex flex-row items-center gap-2">
            <Text className="text-primary text-3xl font-bold">
              {data.title}
            </Text>
            {data.completed && (
              <View className="bg-primary rounded-full px-2 py-1">
                <Text className="text-primary-foreground text-xs font-semibold">
                  ✓ Done
                </Text>
              </View>
            )}
          </View>

          <Text className="text-muted-foreground mb-4 text-lg">
            {SESSION_TYPES_DISPLAY[data.type].label}
          </Text>

          <View className="mb-4">
            <Text className="text-muted-foreground mb-1 text-sm">Priority</Text>
            <View className="flex flex-row gap-2">
              {PRIORITY_LEVELS.map((priority) => (
                <View
                  key={priority}
                  className={`rounded-md border px-3 py-1 ${
                    data.priority === priority
                      ? "bg-primary border-primary"
                      : "border-input bg-background"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      data.priority === priority
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {priority}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-muted-foreground mb-1 text-sm">Date</Text>
            <Text className="text-foreground text-base">
              {formatDateForDisplay(data.startTime)}
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-muted-foreground mb-1 text-sm">Time</Text>
            <Text className="text-foreground text-base">
              {formatTimeRange(data.startTime, data.endTime)}
            </Text>
          </View>

          {data.description && (
            <View className="mb-4">
              <Text className="text-muted-foreground mb-1 text-sm">
                Description
              </Text>
              <Text className="text-foreground text-base">
                {data.description}
              </Text>
            </View>
          )}

          <Button
            variant={data.completed ? "secondary" : "default"}
            onPress={handleToggleComplete}
            disabled={toggleCompleteMutation.isPending}
            className="mt-4"
          >
            {toggleCompleteMutation.isPending
              ? "Updating..."
              : data.completed
                ? "Mark as Incomplete"
                : "Mark as Complete"}
          </Button>
          <Button
            variant="default"
            onPress={handleUpdate}
            className="mt-4"
          >
            Update
          </Button>

          <Button
            variant="destructive"
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
            className="mt-4"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Session"}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
