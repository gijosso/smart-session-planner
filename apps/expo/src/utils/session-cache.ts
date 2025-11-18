import type { QueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

/**
 * Check if a date falls within today
 * Uses local timezone for comparison (matches user's browser timezone)
 * The backend will do proper timezone conversion, but this gives us a good approximation
 */
function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  // Compare date components in local timezone
  const dateYear = d.getFullYear();
  const dateMonth = d.getMonth();
  const dateDay = d.getDate();

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDay = now.getDate();

  return dateYear === nowYear && dateMonth === nowMonth && dateDay === nowDay;
}

/**
 * Check if a date falls within the current week (Sunday to Saturday)
 * Uses local timezone for comparison
 */
function isThisWeek(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  // Get start of week (Sunday) in local timezone
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // Get end of week (Saturday) in local timezone
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return d >= startOfWeek && d <= endOfWeek;
}

/**
 * Invalidate session queries based on the session's date
 * Only invalidates "today" and "week" if the session actually falls within those ranges
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

  // Always invalidate all sessions (for lists that show all sessions)
  void queryClient.invalidateQueries(trpc.session.all.queryFilter());

  // Invalidate byId if we have an id
  if (session.id) {
    void queryClient.invalidateQueries(
      trpc.session.byId.queryFilter({ id: session.id }),
    );
  }

  // Only invalidate today/week if the session is actually in those ranges
  if (isToday(startTime)) {
    void queryClient.invalidateQueries(trpc.session.today.queryFilter());
  }

  if (isThisWeek(startTime)) {
    void queryClient.invalidateQueries(trpc.session.week.queryFilter());
  }
}

/**
 * Invalidate session queries for both old and new session states
 * Useful for updates where the date might have changed
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

  // Always invalidate all sessions
  void queryClient.invalidateQueries(trpc.session.all.queryFilter());

  // Invalidate byId if we have an id
  if (oldSession.id || newSession.id) {
    const id = newSession.id ?? oldSession.id;
    if (id) {
      void queryClient.invalidateQueries(trpc.session.byId.queryFilter({ id }));
    }
  }

  // Invalidate today/week if EITHER old or new session is in those ranges
  if (isToday(oldStartTime) || isToday(newStartTime)) {
    void queryClient.invalidateQueries(trpc.session.today.queryFilter());
  }

  if (isThisWeek(oldStartTime) || isThisWeek(newStartTime)) {
    void queryClient.invalidateQueries(trpc.session.week.queryFilter());
  }
}
