import type { QueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

/**
 * Get user's timezone (defaults to browser timezone)
 * In most cases, the browser timezone matches the user's preference
 */
function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Check if a date falls within today in a specific timezone
 * Uses Intl.DateTimeFormat to properly compare dates in the given timezone
 */
function isTodayInTimezone(date: Date | string, timezone: string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  // Format both dates in the given timezone and compare date components
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const dateStr = dateFormatter.format(d);
  const nowStr = dateFormatter.format(now);

  return dateStr === nowStr;
}

/**
 * Check if a date falls within the current week (Sunday to Saturday) in a specific timezone
 * Uses Intl.DateTimeFormat to properly compare dates in the given timezone
 */
function isThisWeekInTimezone(date: Date | string, timezone: string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  // Get current date components in the timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const nowParts = formatter.formatToParts(now);
  const weekday = nowParts.find((p) => p.type === "weekday")?.value ?? "Sunday";
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

  // Calculate start of week (Sunday) in the timezone
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // Calculate end of week (Saturday) in the timezone
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Format dates to compare in the timezone
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const dateStr = dateFormatter.format(d);
  const startStr = dateFormatter.format(startOfWeek);
  const endStr = dateFormatter.format(endOfWeek);

  // Compare as strings (YYYY-MM-DD format)
  return dateStr >= startStr && dateStr <= endStr;
}

/**
 * Invalidate session queries based on the session's date
 * Uses timezone-aware checking to only invalidate relevant queries
 * Also invalidates stats queries since they depend on session data
 */
export function invalidateSessionQueries(
  queryClient: QueryClient,
  session: {
    startTime: Date | string;
    id?: string;
  },
) {
  const startTime =
    typeof session.startTime === "string"
      ? new Date(session.startTime)
      : session.startTime;

  // Get user's timezone (defaults to browser timezone)
  const timezone = getUserTimezone();

  // Always invalidate all sessions (for lists that show all sessions)
  void queryClient.invalidateQueries(trpc.session.all.queryFilter());

  // Invalidate stats (since any session change affects stats)
  void queryClient.invalidateQueries(trpc.stats.sessions.queryFilter());

  // Invalidate byId if we have an id
  if (session.id) {
    void queryClient.invalidateQueries(
      trpc.session.byId.queryFilter({ id: session.id }),
    );
  }

  // Only invalidate today/week if the session is actually in those ranges (timezone-aware)
  if (isTodayInTimezone(startTime, timezone)) {
    void queryClient.invalidateQueries(trpc.session.today.queryFilter());
  }

  if (isThisWeekInTimezone(startTime, timezone)) {
    void queryClient.invalidateQueries(trpc.session.week.queryFilter());
  }
}

/**
 * Invalidate session queries for both old and new session states
 * Useful for updates where the date might have changed
 * Uses timezone-aware checking to only invalidate relevant queries
 * Also invalidates stats queries since they depend on session data
 */
export function invalidateSessionQueriesForUpdate(
  queryClient: QueryClient,
  oldSession: {
    startTime: Date | string;
    id?: string;
  },
  newSession: {
    startTime: Date | string;
    id?: string;
  },
) {
  const oldStartTime =
    typeof oldSession.startTime === "string"
      ? new Date(oldSession.startTime)
      : oldSession.startTime;
  const newStartTime =
    typeof newSession.startTime === "string"
      ? new Date(newSession.startTime)
      : newSession.startTime;

  // Get user's timezone (defaults to browser timezone)
  const timezone = getUserTimezone();

  // Always invalidate all sessions
  void queryClient.invalidateQueries(trpc.session.all.queryFilter());

  // Invalidate stats (since any session change affects stats)
  void queryClient.invalidateQueries(trpc.stats.sessions.queryFilter());

  // Invalidate byId if we have an id
  if (oldSession.id || newSession.id) {
    const id = newSession.id ?? oldSession.id;
    if (id) {
      void queryClient.invalidateQueries(trpc.session.byId.queryFilter({ id }));
    }
  }

  // Invalidate today/week if EITHER old or new session is in those ranges (timezone-aware)
  if (
    isTodayInTimezone(oldStartTime, timezone) ||
    isTodayInTimezone(newStartTime, timezone)
  ) {
    void queryClient.invalidateQueries(trpc.session.today.queryFilter());
  }

  if (
    isThisWeekInTimezone(oldStartTime, timezone) ||
    isThisWeekInTimezone(newStartTime, timezone)
  ) {
    void queryClient.invalidateQueries(trpc.session.week.queryFilter());
  }
}
