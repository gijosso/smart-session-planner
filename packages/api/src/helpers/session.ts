import type { z } from "zod/v4";

import type { db } from "@ssp/db/client";
import type { CreateSessionSchema, SESSION_TYPES } from "@ssp/db/schema";
import {
  and,
  eq,
  getEndOfDayInTimezone,
  getStartOfDayInTimezone,
  getUserTimezone,
  gte,
  isNull,
  lt,
  ne,
  sql,
} from "@ssp/db";
import { Profile, Session } from "@ssp/db/schema";

/**
 * Type that accepts both database and transaction objects
 * Used for functions that need to work within transactions
 */
type DatabaseOrTransaction =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Get user's timezone from database (defaults to UTC if not set)
 * This helper reduces duplication by centralizing timezone fetching logic
 *
 * @deprecated Use getUserTimezoneFromContext instead for better performance
 * This function is kept for backward compatibility and for cases where context is not available
 */
export async function getUserTimezoneFromDb(
  database: typeof db,
  userId: string,
): Promise<string> {
  const profile = await database.query.Profile.findFirst({
    where: eq(Profile.userId, userId),
  });
  return getUserTimezone(profile?.timezone ?? null);
}

/**
 * Get sessions for today (timezone-aware)
 */
export async function getSessionsToday(
  database: typeof db,
  userId: string,
  timezone?: string,
) {
  // Get user's timezone (use provided timezone or fetch from database)
  const userTimezone =
    timezone ?? (await getUserTimezoneFromDb(database, userId));

  const now = new Date();
  // Calculate start and end of "today" in user's timezone, converted to UTC
  const startOfTodayUTC = getStartOfDayInTimezone(now, userTimezone);
  const endOfTodayUTC = getEndOfDayInTimezone(now, userTimezone);

  // Query database using UTC boundaries
  return database.query.Session.findMany({
    where: and(
      eq(Session.userId, userId),
      isNull(Session.deletedAt), // Exclude soft-deleted sessions
      gte(Session.startTime, startOfTodayUTC),
      lt(Session.startTime, endOfTodayUTC), // Use < instead of <= for end boundary
    ),
    orderBy: [Session.startTime],
  });
}

/**
 * Get sessions for the current week (timezone-aware)
 */
export async function getSessionsWeek(
  database: typeof db,
  userId: string,
  timezone?: string,
) {
  // Get user's timezone (use provided timezone or fetch from database)
  const userTimezone =
    timezone ?? (await getUserTimezoneFromDb(database, userId));

  const now = new Date();

  // Get the current date components in the user's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: userTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  // Get day of week (0 = Sunday, 6 = Saturday) in user's timezone
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sunday";
  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const dayOfWeek = weekdayMap[weekday] ?? 0;

  // Calculate start of week (Sunday) - get today's start, then subtract days
  const todayStart = getStartOfDayInTimezone(now, userTimezone);
  const startOfWeekUTC = new Date(
    todayStart.getTime() - dayOfWeek * 24 * 60 * 60 * 1000,
  );

  // Calculate end of week (Saturday) - add 6 days to start of week
  const endOfWeekUTC = new Date(
    startOfWeekUTC.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  // Query database using UTC boundaries
  return database.query.Session.findMany({
    where: and(
      eq(Session.userId, userId),
      isNull(Session.deletedAt), // Exclude soft-deleted sessions
      gte(Session.startTime, startOfWeekUTC),
      lt(Session.startTime, endOfWeekUTC), // Use < instead of <= for end boundary
    ),
    orderBy: [Session.startTime],
  });
}

/**
 * Get a session by ID (only if it belongs to the user and is not deleted)
 */
export async function getSessionById(
  database: typeof db,
  userId: string,
  id: string,
) {
  return database.query.Session.findFirst({
    where: and(
      eq(Session.id, id),
      eq(Session.userId, userId),
      isNull(Session.deletedAt), // Exclude soft-deleted sessions
    ),
  });
}

/**
 * Create a new session
 * @param allowConflicts - If false, throws error on conflicts. If true, allows conflicts.
 */
export async function createSession(
  database: typeof db,
  userId: string,
  input: z.infer<typeof CreateSessionSchema>,
  allowConflicts = false,
) {
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
        `Session conflicts with ${conflicts.length} existing session(s)`,
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
    throw new Error("Failed to create session");
  }

  return result;
}

/**
 * Update a session (only if it belongs to the user)
 * @param allowConflicts - If false, throws error on conflicts. If true, allows conflicts.
 */
export async function updateSession(
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
) {
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

  // Check for conflicts if time is being updated and conflicts are not allowed
  if (!allowConflicts && (updates.startTime || updates.endTime)) {
    const finalStartTime = updates.startTime ?? existingSession.startTime;
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
        `Updated session conflicts with ${conflicts.length} existing session(s)`,
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
      // Marking as completed: set completedAt if not already set
      updateData.completedAt = existingSession.completedAt ?? new Date();
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
    throw new Error("Failed to update session");
  }

  return updated;
}

/**
 * Toggle completion status of a session
 * Sets completedAt timestamp when completing, clears it when uncompleting
 */
export async function toggleSessionComplete(
  database: typeof db,
  userId: string,
  id: string,
) {
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
    throw new Error("Failed to toggle session completion");
  }

  return updated;
}

/**
 * Soft delete a session (only if it belongs to the user)
 * Sets deletedAt timestamp instead of actually deleting the record
 */
export async function deleteSession(
  database: typeof db,
  userId: string,
  id: string,
) {
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
    throw new Error("Failed to delete session");
  }

  return deleted;
}

/**
 * Check if a session time range conflicts with existing sessions
 * Returns an array of conflicting sessions (empty if no conflicts)
 *
 * Optimized: Uses SQL query instead of loading all sessions into memory
 * Two sessions overlap if: start1 < end2 AND start2 < end1
 *
 * Performance: Uses database indexes efficiently and filters in SQL
 *
 * @param database - Database instance (can be transaction object from db.transaction)
 */
export async function checkSessionConflicts(
  database: DatabaseOrTransaction,
  userId: string,
  startTime: Date,
  endTime: Date,
  excludeSessionId?: string, // Optional: exclude a session (useful for updates)
): Promise<Awaited<ReturnType<typeof database.query.Session.findMany>>> {
  // Build conditions for conflict detection
  // Two sessions overlap if: start1 < end2 AND start2 < end1
  const conditions = [
    eq(Session.userId, userId),
    isNull(Session.deletedAt), // Only check non-deleted sessions
    eq(Session.completed, false), // Only check non-completed sessions
    lt(Session.startTime, endTime), // start_time < endTime
    sql`${startTime} < ${Session.endTime}`, // startTime < end_time
  ];

  // Exclude specific session if provided (for updates)
  if (excludeSessionId) {
    conditions.push(ne(Session.id, excludeSessionId));
  }

  // Use select query for type safety and efficiency
  // This leverages the partial index on (user_id, start_time) WHERE deleted_at IS NULL AND completed = false
  return database
    .select()
    .from(Session)
    .where(and(...conditions));
}
