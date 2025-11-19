import type { z } from "zod/v4";

import type { db } from "@ssp/db/client";
import type { CreateSessionSchema, SESSION_TYPES } from "@ssp/db/schema";
import {
  and,
  desc,
  eq,
  getEndOfDayInTimezone,
  getStartOfDayInTimezone,
  getUserTimezone,
  gte,
  lt,
} from "@ssp/db";
import { Profile, Session } from "@ssp/db/schema";

/**
 * Get all sessions for a user
 */
export async function getAllSessions(database: typeof db, userId: string) {
  return database.query.Session.findMany({
    where: eq(Session.userId, userId),
    orderBy: desc(Session.startTime),
  });
}

/**
 * Get sessions for a specific date range (timezone-aware)
 */
export async function getSessionsByDateRange(
  database: typeof db,
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  // Get user's profile to retrieve timezone preference
  const profile = await database.query.Profile.findFirst({
    where: eq(Profile.userId, userId),
  });

  const userTimezone = getUserTimezone(profile?.timezone ?? null);

  // Convert date boundaries to UTC based on user's timezone
  const startUTC = getStartOfDayInTimezone(startDate, userTimezone);
  const endUTC = getEndOfDayInTimezone(endDate, userTimezone);

  return database.query.Session.findMany({
    where: and(
      eq(Session.userId, userId),
      gte(Session.startTime, startUTC),
      lt(Session.startTime, endUTC), // Use < instead of <= for end boundary
    ),
    orderBy: desc(Session.startTime),
  });
}

/**
 * Get sessions for today (timezone-aware)
 */
export async function getSessionsToday(database: typeof db, userId: string) {
  // Get user's profile to retrieve timezone preference
  const profile = await database.query.Profile.findFirst({
    where: eq(Profile.userId, userId),
  });

  // Get user's timezone (default to UTC)
  const userTimezone = getUserTimezone(profile?.timezone ?? null);

  const now = new Date();
  // Calculate start and end of "today" in user's timezone, converted to UTC
  const startOfTodayUTC = getStartOfDayInTimezone(now, userTimezone);
  const endOfTodayUTC = getEndOfDayInTimezone(now, userTimezone);

  // Query database using UTC boundaries
  return database.query.Session.findMany({
    where: and(
      eq(Session.userId, userId),
      gte(Session.startTime, startOfTodayUTC),
      lt(Session.startTime, endOfTodayUTC), // Use < instead of <= for end boundary
    ),
    orderBy: [Session.startTime],
  });
}

/**
 * Get sessions for the current week (timezone-aware)
 */
export async function getSessionsWeek(database: typeof db, userId: string) {
  // Get user's profile to retrieve timezone preference
  const profile = await database.query.Profile.findFirst({
    where: eq(Profile.userId, userId),
  });

  // Get user's timezone (default to UTC)
  const userTimezone = getUserTimezone(profile?.timezone ?? null);

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
      gte(Session.startTime, startOfWeekUTC),
      lt(Session.startTime, endOfWeekUTC), // Use < instead of <= for end boundary
    ),
    orderBy: [Session.startTime],
  });
}

/**
 * Get a session by ID (only if it belongs to the user)
 */
export async function getSessionById(
  database: typeof db,
  userId: string,
  id: string,
) {
  return database.query.Session.findFirst({
    where: and(eq(Session.id, id), eq(Session.userId, userId)),
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

  const [result] = await database
    .insert(Session)
    .values({
      ...input,
      userId,
    })
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
  // Verify the session belongs to the user
  const existingSession = await database.query.Session.findFirst({
    where: and(eq(Session.id, id), eq(Session.userId, userId)),
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

  const [updated] = await database
    .update(Session)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(Session.id, id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update session");
  }

  return updated;
}

/**
 * Toggle completion status of a session
 */
export async function toggleSessionComplete(
  database: typeof db,
  userId: string,
  id: string,
) {
  // Verify the session belongs to the user
  const existingSession = await database.query.Session.findFirst({
    where: and(eq(Session.id, id), eq(Session.userId, userId)),
  });

  if (!existingSession) {
    throw new Error("Session not found or access denied");
  }

  const [updated] = await database
    .update(Session)
    .set({
      completed: !existingSession.completed,
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
 * Delete a session (only if it belongs to the user)
 */
export async function deleteSession(
  database: typeof db,
  userId: string,
  id: string,
) {
  // Verify the session belongs to the user
  const existingSession = await database.query.Session.findFirst({
    where: and(eq(Session.id, id), eq(Session.userId, userId)),
  });

  if (!existingSession) {
    throw new Error("Session not found or access denied");
  }

  return database.delete(Session).where(eq(Session.id, id));
}

/**
 * Check if a session time range conflicts with existing sessions
 * Returns an array of conflicting sessions (empty if no conflicts)
 */
export async function checkSessionConflicts(
  database: typeof db,
  userId: string,
  startTime: Date,
  endTime: Date,
  excludeSessionId?: string, // Optional: exclude a session (useful for updates)
): Promise<Awaited<ReturnType<typeof database.query.Session.findMany>>> {
  // Find all sessions that overlap with the given time range
  // Two sessions overlap if:
  // - session1.start < session2.end AND session2.start < session1.end
  const allSessions = await database.query.Session.findMany({
    where: eq(Session.userId, userId),
  });

  const conflicts = allSessions.filter((session) => {
    // Exclude the session being updated
    if (excludeSessionId && session.id === excludeSessionId) {
      return false;
    }

    // Check for overlap: sessions overlap if start1 < end2 AND start2 < end1
    return (
      session.startTime < endTime &&
      startTime < session.endTime &&
      !session.completed // Only check conflicts with non-completed sessions
    );
  });

  return conflicts;
}

/**
 * Get all upcoming (future) sessions for a user (timezone-aware)
 */
export async function getUpcomingSessions(database: typeof db, userId: string) {
  // TODO: Add timezone support
  // Get user's profile to retrieve timezone preference
  // const profile = await database.query.Profile.findFirst({
  //   where: eq(Profile.userId, userId),
  // });
  // const userTimezone = getUserTimezone(profile?.timezone ?? null);

  // Get current time in UTC
  const now = new Date();

  // Query for sessions that start in the future
  return database.query.Session.findMany({
    where: and(
      eq(Session.userId, userId),
      gte(Session.startTime, now), // Only future sessions
    ),
    orderBy: [Session.startTime], // Order by start time ascending
  });
}
