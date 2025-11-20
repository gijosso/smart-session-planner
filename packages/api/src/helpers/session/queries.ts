import type { db } from "@ssp/db/client";
import {
  and,
  desc,
  eq,
  getEndOfDayInTimezone,
  getStartOfDayInTimezone,
  gte,
  isNull,
  lt,
  sql,
} from "@ssp/db";
import { Session } from "@ssp/db/schema";

import type { DatabaseOrTransaction } from "../../utils/types";
import {
  DATE_CONSTANTS,
  REQUEST_CONSTANTS,
  VALIDATION_CONSTANTS,
} from "../../utils/constants";
import { isValidTimezone } from "../../utils/date";
import { executeTypedQuery } from "../../utils/db/typed-sql";
import { withErrorHandling } from "../../utils/error";

/**
 * Validate and normalize pagination limit
 * Ensures limit is within acceptable bounds to prevent DoS
 *
 * @param limit - The limit value to validate (may be undefined)
 * @returns Normalized limit value between 1 and MAX_PAGINATION_LIMIT
 */
function validateLimit(limit: number | undefined): number {
  const defaultLimit = REQUEST_CONSTANTS.DEFAULT_PAGINATION_LIMIT as number;
  const maxLimit = REQUEST_CONSTANTS.MAX_PAGINATION_LIMIT as number;

  if (limit === undefined || !Number.isFinite(limit)) {
    return defaultLimit;
  }

  // Ensure limit is a positive integer
  const normalizedLimit = Math.max(1, Math.floor(Number(limit)));

  // Enforce maximum to prevent DoS
  return Math.min(normalizedLimit, maxLimit);
}

/**
 * Validate and normalize pagination offset
 * Ensures offset is non-negative and within acceptable bounds
 *
 * @param offset - The offset value to validate (may be undefined)
 * @returns Normalized offset value between 0 and MAX_PAGINATION_OFFSET
 */
function validateOffset(offset: number | undefined): number {
  const defaultOffset = 0;
  const maxOffset = REQUEST_CONSTANTS.MAX_PAGINATION_OFFSET as number;

  if (offset === undefined || !Number.isFinite(offset)) {
    return defaultOffset;
  }

  // Ensure offset is non-negative
  const normalizedOffset = Math.max(0, Math.floor(Number(offset)));

  // Enforce maximum to prevent performance issues
  return Math.min(normalizedOffset, maxOffset);
}

/**
 * Get all sessions for a user (excluding soft-deleted sessions)
 * Supports pagination via limit and offset (backward compatible)
 * Returns sessions with pagination metadata
 *
 * Uses a single query with window function COUNT(*) OVER() for efficient pagination.
 * This reduces database round trips from 2 to 1 and ensures atomicity.
 *
 * Note: For better performance on large datasets, use getAllSessionsCursor instead.
 */
export const getAllSessions = async (
  database: typeof db,
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<{
  sessions: (typeof Session.$inferSelect)[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> => {
  // Validate and normalize pagination parameters to prevent DoS
  const limit = validateLimit(options?.limit);
  const offset = validateOffset(options?.offset);

  return withErrorHandling(
    async () => {
      // Use window function to get total count and paginated sessions in a single query
      // This ensures atomicity and reduces database round trips
      // Optimized: Uses index on (user_id, deleted_at, start_time) for efficient filtering and sorting
      const { rows: sessions, total } = await executeTypedQuery<
        typeof Session.$inferSelect
      >(
        database,
        Session,
        sql`
          SELECT 
            s.*,
            COUNT(*) OVER()::integer as total_count
          FROM ${Session} s
          WHERE s.user_id = ${userId}
            AND s.deleted_at IS NULL
          ORDER BY s.start_time DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `,
      );

      return {
        sessions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + sessions.length < total,
        },
      };
    },
    "get all sessions",
    { userId },
  );
};

/**
 * Get all sessions for a user using cursor-based pagination (more efficient)
 * Supports pagination via limit and cursor (ISO datetime string)
 * Returns sessions with pagination metadata
 *
 * Cursor-based pagination is more efficient than offset-based because:
 * - No need to scan skipped rows (offset requires scanning all previous rows)
 * - Consistent results even if data changes between requests
 * - Better performance on large datasets
 *
 * Uses index on (user_id, deleted_at, start_time) for efficient filtering and sorting.
 */
export const getAllSessionsCursor = async (
  database: typeof db,
  userId: string,
  options?: { limit?: number; cursor?: string },
): Promise<{
  sessions: (typeof Session.$inferSelect)[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}> => {
  // Validate and normalize pagination limit to prevent DoS
  const limit = validateLimit(options?.limit);
  const cursor = options?.cursor ? new Date(options.cursor) : null;

  return withErrorHandling(
    async () => {
      // Validate cursor format if provided
      if (options?.cursor) {
        if (!cursor) {
          // Date constructor failed to parse the string
          throw new Error(
            "Invalid cursor format. Expected ISO datetime string.",
          );
        }
        if (isNaN(cursor.getTime())) {
          throw new Error(
            "Invalid cursor format. Expected valid ISO datetime string.",
          );
        }
        // Validate cursor is not too far in the past or future (sanity check)
        const now = new Date();
        const maxPastDate = new Date(
          now.getTime() -
            REQUEST_CONSTANTS.MAX_PAST_YEARS *
              REQUEST_CONSTANTS.DAYS_PER_YEAR *
              DATE_CONSTANTS.MS_PER_DAY,
        );
        const maxFutureDate = new Date(
          now.getTime() +
            REQUEST_CONSTANTS.MAX_FUTURE_YEARS *
              REQUEST_CONSTANTS.DAYS_PER_YEAR *
              DATE_CONSTANTS.MS_PER_DAY,
        );
        if (cursor < maxPastDate || cursor > maxFutureDate) {
          throw new Error("Invalid cursor: date is outside acceptable range.");
        }
      }

      // Build query conditions
      const conditions = [
        eq(Session.userId, userId),
        isNull(Session.deletedAt),
      ];

      // Add cursor condition if provided (cursor is the start_time of the last session)
      // We want sessions with start_time < cursor (since we're ordering DESC)
      if (cursor) {
        conditions.push(lt(Session.startTime, cursor));
      }

      // Fetch one extra to determine if there are more results
      const fetchLimit = limit + 1;

      const sessions = await database.query.Session.findMany({
        where: and(...conditions),
        orderBy: [desc(Session.startTime)],
        limit: fetchLimit,
      });

      // Determine if there are more results
      const hasMore = sessions.length > limit;
      const resultSessions = hasMore ? sessions.slice(0, limit) : sessions;

      // Get next cursor (start_time of the last session in the result)
      const nextCursor =
        resultSessions.length > 0 && hasMore
          ? (resultSessions[
              resultSessions.length - 1
            ]?.startTime.toISOString() ?? null)
          : null;

      return {
        sessions: resultSessions,
        pagination: {
          limit,
          hasMore,
          nextCursor,
        },
      };
    },
    "get all sessions cursor",
    { userId, limit, cursor: cursor?.toISOString() },
  );
};

/**
 * Get sessions for a specific date range (timezone-aware)
 * Dates are interpreted in the user's timezone preference
 */
export const getSessionsByDateRange = async (
  database: typeof db,
  userId: string,
  startDate: Date,
  endDate: Date,
  cachedTimezone: string,
): Promise<(typeof Session.$inferSelect)[]> =>
  withErrorHandling(
    async () => {
      // Validate timezone to prevent runtime errors
      if (!isValidTimezone(cachedTimezone)) {
        throw new Error(`Invalid timezone: ${cachedTimezone}`);
      }

      // Validate date range is reasonable
      const dateRangeMs = endDate.getTime() - startDate.getTime();
      const dateRangeDays = dateRangeMs / DATE_CONSTANTS.MS_PER_DAY;
      if (dateRangeDays > REQUEST_CONSTANTS.MAX_DATE_RANGE_DAYS) {
        throw new Error(
          `Date range cannot exceed ${REQUEST_CONSTANTS.MAX_DATE_RANGE_DAYS} days`,
        );
      }

      // Validate dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date provided");
      }
      // Use cached timezone (provided by middleware)
      // Convert date boundaries to UTC based on user's timezone
      const startUTC = getStartOfDayInTimezone(startDate, cachedTimezone);
      const endUTC = getEndOfDayInTimezone(endDate, cachedTimezone);

      // Optimized: Uses index on (user_id, start_time) WHERE deleted_at IS NULL
      // Range query on start_time is efficient with proper index
      return await database.query.Session.findMany({
        where: and(
          eq(Session.userId, userId),
          isNull(Session.deletedAt), // Exclude soft-deleted sessions
          gte(Session.startTime, startUTC),
          lt(Session.startTime, endUTC), // Use < instead of <= for end boundary
        ),
        orderBy: desc(Session.startTime),
      });
    },
    "get sessions by date range",
    {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: cachedTimezone,
    },
  );

/**
 * Get sessions for today (timezone-aware)
 * "Today" is calculated based on the user's timezone preference
 */
export const getSessionsToday = async (
  database: typeof db,
  userId: string,
  cachedTimezone: string,
): Promise<(typeof Session.$inferSelect)[]> =>
  withErrorHandling(
    async () => {
      // Validate timezone to prevent runtime errors
      if (!isValidTimezone(cachedTimezone)) {
        throw new Error(`Invalid timezone: ${cachedTimezone}`);
      }
      // Use cached timezone (provided by middleware)
      const now = new Date();
      // Calculate start and end of "today" in user's timezone, converted to UTC
      const startOfTodayUTC = getStartOfDayInTimezone(now, cachedTimezone);
      const endOfTodayUTC = getEndOfDayInTimezone(now, cachedTimezone);

      // Query database using UTC boundaries
      return await database.query.Session.findMany({
        where: and(
          eq(Session.userId, userId),
          isNull(Session.deletedAt), // Exclude soft-deleted sessions
          gte(Session.startTime, startOfTodayUTC),
          lt(Session.startTime, endOfTodayUTC), // Use < instead of <= for end boundary
        ),
        orderBy: [Session.startTime],
      });
    },
    "get sessions for today",
    {
      userId,
      timezone: cachedTimezone,
    },
  );

/**
 * Get sessions for the current week (timezone-aware)
 *
 * Calculates the current week as Sunday to Saturday based on the user's timezone preference,
 * then queries for all sessions within that week range.
 *
 * Week boundaries are calculated in the user's timezone, then converted to UTC for database queries.
 * Uses timezone-aware date calculations to handle daylight saving time transitions correctly.
 *
 * Optimized: Uses a single Intl.DateTimeFormat instance for day-of-week calculation.
 */
export const getSessionsWeek = async (
  database: typeof db,
  userId: string,
  cachedTimezone: string,
): Promise<(typeof Session.$inferSelect)[]> =>
  withErrorHandling(
    async () => {
      // Validate timezone to prevent runtime errors
      if (!isValidTimezone(cachedTimezone)) {
        throw new Error(`Invalid timezone: ${cachedTimezone}`);
      }
      // Use cached timezone (provided by middleware)
      const now = new Date();

      // Optimized: Use a single formatter instance and cache the weekday map
      const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: cachedTimezone,
        weekday: "long",
      });
      const weekdayName = weekdayFormatter.format(now);
      const weekdayMap: Record<string, number> = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };
      const dayOfWeek = weekdayMap[weekdayName] ?? 0;

      // Calculate start of week (Sunday) - get today's start, then subtract days
      const todayStart = getStartOfDayInTimezone(now, cachedTimezone);
      const startOfWeekUTC = new Date(
        todayStart.getTime() - dayOfWeek * DATE_CONSTANTS.MS_PER_DAY,
      );

      // Calculate end of week (Saturday) - add 7 days to start of week
      const endOfWeekUTC = new Date(
        startOfWeekUTC.getTime() +
          DATE_CONSTANTS.DAYS_PER_WEEK * DATE_CONSTANTS.MS_PER_DAY,
      );

      // Query database using UTC boundaries
      return await database.query.Session.findMany({
        where: and(
          eq(Session.userId, userId),
          isNull(Session.deletedAt), // Exclude soft-deleted sessions
          gte(Session.startTime, startOfWeekUTC),
          lt(Session.startTime, endOfWeekUTC), // Use < instead of <= for end boundary
        ),
        orderBy: [Session.startTime],
      });
    },
    "get sessions for week",
    {
      userId,
      timezone: cachedTimezone,
    },
  );

/**
 * Get a session by ID (only if it belongs to the user and is not deleted)
 */
export const getSessionById = async (
  database: DatabaseOrTransaction,
  userId: string,
  id: string,
): Promise<typeof Session.$inferSelect> =>
  withErrorHandling(
    async () => {
      // Validate UUID format
      if (!VALIDATION_CONSTANTS.UUID_REGEX.test(id)) {
        throw new Error("Invalid session ID format");
      }
      const session = await database.query.Session.findFirst({
        where: and(
          eq(Session.id, id),
          eq(Session.userId, userId),
          isNull(Session.deletedAt), // Exclude soft-deleted sessions
        ),
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      return session;
    },
    "get session by id",
    { userId, sessionId: id },
  );

/**
 * Get all upcoming (future) sessions for a user
 * Returns sessions that start in the future (based on current UTC time)
 */
export const getUpcomingSessions = async (
  database: typeof db,
  userId: string,
): Promise<(typeof Session.$inferSelect)[]> =>
  withErrorHandling(
    async () => {
      // Get current time in UTC
      const now = new Date();

      // Query for sessions that start in the future
      return await database.query.Session.findMany({
        where: and(
          eq(Session.userId, userId),
          isNull(Session.deletedAt), // Exclude soft-deleted sessions
          gte(Session.startTime, now), // Only future sessions
        ),
        orderBy: [Session.startTime], // Order by start time ascending
      });
    },
    "get upcoming sessions",
    { userId },
  );
