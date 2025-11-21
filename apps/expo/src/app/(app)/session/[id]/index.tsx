import { useCallback, useMemo } from "react";
import { Alert, Text, View } from "react-native";
import { router, useGlobalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BackButtonTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  ErrorScreen,
  LoadingScreen,
  Screen,
} from "~/components";
import { Content } from "~/components/layout/content";
import { PRIORITY_LEVELS } from "~/constants/app";
import { COLORS_BACKGROUND_LIGHT, COLORS_MUTED } from "~/constants/colors";
import { SESSION_TYPES_DISPLAY } from "~/constants/session";
import {
  getSessionDeleteMutationOptions,
  getSessionMutationOptions,
} from "~/features/session/use-session-mutation";
import { useQueryError } from "~/hooks/use-query-error";
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
  const {
    data: session,
    isLoading,
    error,
  } = useQuery(trpc.session.byId.queryOptions({ id }));
  const queryError = useQueryError({ error });

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

  const handleRetry = useCallback(() => {
    void queryClient.invalidateQueries(trpc.session.byId.queryFilter({ id }));
  }, [id, queryClient]);

  const handleReset = useCallback(() => {
    router.back();
  }, []);

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
          {session.completed && (
            <View
              className="bg-foreground items-center justify-center rounded-full p-1"
              accessibilityRole="image"
              accessibilityLabel="Completed indicator"
            >
              <Ionicons
                name="checkmark-outline"
                size={14}
                color={COLORS_BACKGROUND_LIGHT}
                accessibilityLabel="Checkmark icon"
              />
            </View>
          )}
        </BackButtonTitle>

        <Card>
          <CardHeader>
            <View className="flex flex-1 flex-row items-center justify-end">
              <View
                className="flex flex-row items-center gap-1"
                accessibilityLabel={`Priority level ${session.priority} out of ${PRIORITY_LEVELS.length}`}
                accessibilityRole="image"
              >
                {PRIORITY_LEVELS.map((level) => (
                  <View
                    key={level}
                    className={`h-2 w-2 rounded-full ${
                      level <= session.priority ? "bg-black" : "bg-gray-300"
                    }`}
                    accessibilityLabel={
                      level <= session.priority
                        ? "Active priority"
                        : "Inactive priority"
                    }
                  />
                ))}
              </View>
            </View>

            <View className="flex flex-1 flex-row items-center gap-4">
              <View
                className="bg-muted rounded-xl p-3"
                accessibilityRole="image"
              >
                <Ionicons
                  name={SESSION_TYPES_DISPLAY[session.type].icon}
                  size={22}
                  color={SESSION_TYPES_DISPLAY[session.type].iconColor}
                  accessibilityLabel={`${sessionTypeLabel} icon`}
                />
              </View>

              <Text
                className="text-foreground text-xl font-semibold"
                accessibilityRole="text"
              >
                {sessionTypeLabel}
              </Text>
            </View>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col justify-center gap-4">
            <View className="flex flex-row items-center gap-2">
              <Ionicons
                name="time-outline"
                size={22}
                color={COLORS_MUTED}
                accessibilityLabel="Time icon"
              />

              <Text className="text-secondary-foreground">{formattedDate}</Text>

              <View className="bg-muted-foreground h-1 w-1 rounded-full" />

              <Text className="text-secondary-foreground">
                {formattedTimeRange}
              </Text>
            </View>

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
              className="flex-1"
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
