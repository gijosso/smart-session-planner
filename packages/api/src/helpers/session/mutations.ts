import type { z } from "zod/v4";

import type { db } from "@ssp/db/client";
import type { CreateSessionSchema, SESSION_TYPES } from "@ssp/db/schema";
import { and, eq, isNull } from "@ssp/db";
import { Session } from "@ssp/db/schema";

import { withErrorHandling } from "../../utils/error";
import { logger } from "../../utils/logger";
import {
  validateTimeRange,
  validateTimeRangeWithExisting,
} from "../../utils/validators/time-range";
import { checkSessionConflicts } from "./conflicts";

/**
 * Create a new session
 *
 * Creates a new session for a user with conflict detection.
 */
export const createSession = async (
  database: typeof db,
  userId: string,
  input: z.infer<typeof CreateSessionSchema>,
  allowConflicts = false,
): Promise<typeof Session.$inferSelect> =>
  withErrorHandling(
    async () => {
      // Check for conflicts if not allowing them
      if (!allowConflicts) {
        const conflicts = await checkSessionConflicts(
          database,
          userId,
          input.startTime,
          input.endTime,
        );
        if (conflicts.length > 0) {
          throw new Error(
            `This time slot conflicts with ${conflicts.length} existing session(s)`,
          );
        }
      }

      // Handle completedAt when creating a session
      // If completed = true, set completedAt to current time
      const insertData = {
        ...input,
        userId,
        completedAt: input.completed ? new Date() : null,
      };

      const [result] = await database
        .insert(Session)
        .values(insertData)
        .returning();

      if (!result) {
        throw new Error("Unable to create session");
      }

      logger.info("Session created", {
        sessionId: result.id,
        userId,
        title: result.title,
        startTime: result.startTime.toISOString(),
      });

      return result;
    },
    "create session",
    {
      userId,
      title: input.title,
      type: input.type,
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
      allowConflicts,
    },
  );

/**
 * Update a session (only if it belongs to the user)
 *
 * Updates one or more fields of an existing session with conflict detection
 * and validation.
 */
export const updateSession = async (
  database: typeof db,
  userId: string,
  id: string,
  updates: {
    title?: string;
    type?: (typeof SESSION_TYPES)[number];
    startTime?: Date;
    endTime?: Date;
    completed?: boolean;
    priority?: number;
    description?: string;
  },
  allowConflicts = false,
): Promise<typeof Session.$inferSelect> =>
  withErrorHandling(
    async () => {
      // Validate that at least one field is being updated
      const hasUpdates = Object.keys(updates).length > 0;
      if (!hasUpdates) {
        throw new Error("No fields provided to update");
      }

      // Verify the session belongs to the user and is not deleted
      const existingSession = await database.query.Session.findFirst({
        where: and(
          eq(Session.id, id),
          eq(Session.userId, userId),
          isNull(Session.deletedAt),
        ),
      });

      if (!existingSession) {
        throw new Error("Session not found or access denied");
      }

      // Validate time ranges using centralized validation utilities
      if (updates.startTime && updates.endTime) {
        // Both times provided - validate range
        validateTimeRange(updates.startTime, updates.endTime);
      } else if (updates.startTime && !updates.endTime) {
        // Only startTime provided - validate against existing endTime
        validateTimeRangeWithExisting(
          updates.startTime,
          existingSession.startTime,
          existingSession.endTime,
          true,
        );
      } else if (updates.endTime && !updates.startTime) {
        // Only endTime provided - validate against existing startTime
        validateTimeRangeWithExisting(
          updates.endTime,
          existingSession.startTime,
          existingSession.endTime,
          false,
        );
      }

      // Check for conflicts if time is being updated and conflicts are not allowed
      if (!allowConflicts && (updates.startTime || updates.endTime)) {
        const finalStartTime =
          updates.startTime ?? existingSession.startTime;
        const finalEndTime = updates.endTime ?? existingSession.endTime;

        const conflicts = await checkSessionConflicts(
          database,
          userId,
          finalStartTime,
          finalEndTime,
          id, // Exclude current session
        );
        if (conflicts.length > 0) {
          throw new Error(
            `This time slot conflicts with ${conflicts.length} existing session(s)`,
          );
        }
      }

      // Handle completedAt when completed status changes
      // Ensure completedAt is set when completing, cleared when uncompleting
      const updateData: typeof updates & { completedAt?: Date | null } = {
        ...updates,
      };

      if (updates.completed !== undefined) {
        if (updates.completed) {
          // Marking as completed: always set completedAt to current time
          // This ensures accurate completion timestamp regardless of previous state
          updateData.completedAt = new Date();
        } else {
          // Marking as incomplete: clear completedAt
          updateData.completedAt = null;
        }
      }

      const [updated] = await database
        .update(Session)
        .set(updateData)
        .where(eq(Session.id, id))
        .returning();

      if (!updated) {
        throw new Error("Unable to update session");
      }

      logger.info("Session updated", {
        sessionId: id,
        userId,
        updatedFields: Object.keys(updates),
      });

      return updated;
    },
    "update session",
    {
      userId,
      sessionId: id,
      updatedFields: Object.keys(updates),
      allowConflicts,
    },
  );

/**
 * Toggle completion status of a session
 * Sets completedAt timestamp when completing, clears it when uncompleting
 */
export const toggleSessionComplete = async (
  database: typeof db,
  userId: string,
  id: string,
): Promise<typeof Session.$inferSelect> =>
  withErrorHandling(
    async () => {
      // Verify the session belongs to the user and is not deleted
      const existingSession = await database.query.Session.findFirst({
        where: and(
          eq(Session.id, id),
          eq(Session.userId, userId),
          isNull(Session.deletedAt),
        ),
      });

      if (!existingSession) {
        throw new Error("Session not found or access denied");
      }

      const newCompletedStatus = !existingSession.completed;

      const [updated] = await database
        .update(Session)
        .set({
          completed: newCompletedStatus,
          completedAt: newCompletedStatus ? new Date() : null, // Set timestamp when completing
          updatedAt: new Date(),
        })
        .where(eq(Session.id, id))
        .returning();

      if (!updated) {
        throw new Error("Unable to update session completion status");
      }

      logger.info("Session completion toggled", {
        sessionId: id,
        userId,
        completed: newCompletedStatus,
      });

      return updated;
    },
    "toggle session completion",
    { userId, sessionId: id },
  );

/**
 * Soft delete a session (only if it belongs to the user)
 * Sets deletedAt timestamp instead of actually deleting the record
 */
export const deleteSession = async (
  database: typeof db,
  userId: string,
  id: string,
): Promise<typeof Session.$inferSelect> =>
  withErrorHandling(
    async () => {
      // Verify the session belongs to the user and is not already deleted
      const existingSession = await database.query.Session.findFirst({
        where: and(
          eq(Session.id, id),
          eq(Session.userId, userId),
          isNull(Session.deletedAt),
        ),
      });

      if (!existingSession) {
        throw new Error("Session not found or access denied");
      }

      const [deleted] = await database
        .update(Session)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(Session.id, id))
        .returning();

      if (!deleted) {
        throw new Error("Unable to delete session");
      }

      logger.info("Session deleted", {
        sessionId: id,
        userId,
        title: deleted.title,
      });

      return deleted;
    },
    "delete session",
    { userId, sessionId: id },
  );
