/**
 * Create Sessions for Suggestions Button
 * Development tool to create test sessions that will form patterns for suggestion testing
 */

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { invalidateSessionQueries } from "~/utils/sessions/session-cache";

/**
 * Creates 3 completed sessions that form a pattern for suggestion testing
 *
 * Requirements for pattern detection:
 * 1. At least 3 sessions (MIN_PATTERN_FREQUENCY = 3)
 * 2. Same type (e.g., all "DEEP_WORK")
 * 3. Same day of week (e.g., all on today's day of week) - CRITICAL: pattern detection groups by dayOfWeek
 * 4. Similar time within ±15 minutes (fuzzy clustering)
 * 5. All completed: true
 * 6. All in the past (startTime <= NOW() to satisfy database constraints)
 *
 * This creates 3 sessions on today's day of week (e.g., if today is Wednesday, creates 3 Wednesdays) at the same time
 */
export function CreateSessionsForSuggestionsButton() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Create mutation for individual session creation
  const createSessionMutation = useMutation(
    trpc.session.create.mutationOptions(),
  );

  const createSessionsMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      // Start from today, but ensure the session time is in the past
      // If it's before 7 AM today, use yesterday instead
      const baseDate = new Date(today);
      baseDate.setHours(7, 0, 0, 0); // 7:00 AM today

      // If 7 AM today is in the future, use yesterday instead
      if (baseDate > now) {
        baseDate.setDate(today.getDate() - 1);
      }

      // Create 3 sessions on the same day of week (3 consecutive weeks)
      // All at the same time (7:00 AM - 8:00 AM) to form a clear pattern
      const session1Start = new Date(baseDate);
      const session1End = new Date(baseDate);
      session1End.setHours(8, 0, 0, 0); // 1 hour duration

      const session2Start = new Date(baseDate);
      session2Start.setDate(baseDate.getDate() - 7); // 1 week earlier
      const session2End = new Date(session2Start);
      session2End.setHours(8, 0, 0, 0);

      const session3Start = new Date(baseDate);
      session3Start.setDate(baseDate.getDate() - 14); // 2 weeks earlier
      const session3End = new Date(session3Start);
      session3End.setHours(8, 0, 0, 0);

      // Create 3 WORKOUT sessions on weekends (Saturday) starting from last weekend
      // Time: 12:00 PM (noon) to 1:00 PM (13:00)
      const lastWeekend = new Date(today);
      const currentDayOfWeek = lastWeekend.getDay(); // 0 = Sunday, 6 = Saturday

      // Find the most recent Saturday
      // If today is Saturday and it's past noon, use today; otherwise use last Saturday
      let daysToSubtract = (currentDayOfWeek - 6 + 7) % 7;
      if (daysToSubtract === 0 && now.getHours() >= 12) {
        daysToSubtract = 0; // Use today if it's Saturday and past noon
      } else if (daysToSubtract === 0) {
        daysToSubtract = 7; // If it's Saturday but before noon, use last Saturday
      }

      const workoutBaseDate = new Date(today);
      workoutBaseDate.setDate(today.getDate() - daysToSubtract);
      workoutBaseDate.setHours(12, 0, 0, 0); // 12:00 PM (noon)

      const workout1Start = new Date(workoutBaseDate);
      const workout1End = new Date(workoutBaseDate);
      workout1End.setHours(13, 0, 0, 0); // 1:00 PM (13:00)

      const workout2Start = new Date(workoutBaseDate);
      workout2Start.setDate(workoutBaseDate.getDate() - 7); // 1 week earlier
      const workout2End = new Date(workout2Start);
      workout2End.setHours(13, 0, 0, 0);

      const workout3Start = new Date(workoutBaseDate);
      workout3Start.setDate(workoutBaseDate.getDate() - 14); // 2 weeks earlier
      const workout3End = new Date(workout3Start);
      workout3End.setHours(13, 0, 0, 0);

      const sessions = [
        {
          title: "Deep Work Session",
          type: "DEEP_WORK" as const,
          startTime: session1Start,
          endTime: session1End,
          priority: 4,
          completed: true,
          description: "Test session for suggestions",
        },
        {
          title: "Deep Work Session",
          type: "DEEP_WORK" as const,
          startTime: session2Start,
          endTime: session2End,
          priority: 4,
          completed: true,
          description: "Test session for suggestions",
        },
        {
          title: "Deep Work Session",
          type: "DEEP_WORK" as const,
          startTime: session3Start,
          endTime: session3End,
          priority: 4,
          completed: true,
          description: "Test session for suggestions",
        },
        {
          title: "Workout Session",
          type: "WORKOUT" as const,
          startTime: workout1Start,
          endTime: workout1End,
          priority: 4,
          completed: true,
          description: "Test session for suggestions",
        },
        {
          title: "Workout Session",
          type: "WORKOUT" as const,
          startTime: workout2Start,
          endTime: workout2End,
          priority: 4,
          completed: true,
          description: "Test session for suggestions",
        },
        {
          title: "Workout Session",
          type: "WORKOUT" as const,
          startTime: workout3Start,
          endTime: workout3End,
          priority: 4,
          completed: true,
          description: "Test session for suggestions",
        },
      ];

      // Create all sessions sequentially using mutateAsync
      const createdSessions = [];
      for (const session of sessions) {
        const result = await createSessionMutation.mutateAsync({
          title: session.title,
          type: session.type,
          startTime: session.startTime,
          endTime: session.endTime,
          priority: session.priority,
          description: session.description,
          completed: session.completed,
          allowConflicts: false,
        });
        createdSessions.push(result);
      }

      return createdSessions;
    },
    onSuccess: (createdSessions) => {
      // Invalidate session queries to refresh the UI
      for (const session of createdSessions) {
        invalidateSessionQueries(queryClient, {
          startTime: session.startTime,
          id: session.id,
        });
      }

      // Invalidate suggestions query to refresh suggestions
      void queryClient.invalidateQueries({
        queryKey: trpc.session.suggest.queryKey(),
      });

      toast.success(
        `Created ${createdSessions.length} test sessions for suggestions`,
        "Test Data Created",
      );
    },
    onError: createMutationErrorHandler({
      errorMessage: "Failed to create test sessions. Please try again.",
    }),
  });

  const handleCreateSessions = useCallback(() => {
    createSessionsMutation.mutate();
  }, [createSessionsMutation]);

  return (
    <Button
      variant="outline"
      onPress={handleCreateSessions}
      disabled={createSessionsMutation.isPending}
      accessibilityLabel="Create test sessions for suggestions"
      accessibilityRole="button"
    >
      {createSessionsMutation.isPending
        ? "DEV: Creating Sessions..."
        : "DEV: Create Sessions for Suggestions"}
    </Button>
  );
}
