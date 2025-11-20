import type { db } from "@ssp/db/client";
import type { SessionType } from "@ssp/db/schema";
import { and, eq, getUserTimezone, gte, isNull, lt } from "@ssp/db";
import { Availability, Profile, Session } from "@ssp/db/schema";

import {
  DATE_CONSTANTS,
  REQUEST_CONSTANTS,
  SUGGESTION_CONSTANTS,
} from "../../utils/constants";
import { isValidTimezone } from "../../utils/date";
import { withErrorHandling } from "../../utils/error";
import {
  filterAndLimitSuggestions,
  generateDefaultSuggestions,
  generateSuggestionsFromPatterns,
} from "./generation";
import { detectPatterns } from "./pattern-detection";

/**
 * Suggested session - returns the full shape of a session creation
 * This can be directly used to prefill a session creation form
 */
export interface SuggestedSession {
  title: string;
  type: SessionType;
  startTime: Date;
  endTime: Date;
  priority: number;
  description?: string;
  score: number; // Higher is better (0-100)
  reasons: string[]; // Why this slot was suggested
}

export interface SuggestionOptions {
  startDate?: Date; // Start looking from this date (default: now)
  lookAheadDays?: number; // How many days ahead to look (default: 14)
}

/**
 * Generate smart time slot suggestions based on repeating task patterns
 * This algorithm:
 * - Analyzes past sessions to detect repeating patterns (type, day, time)
 * - Generates suggestions based on these patterns
 * - Prevents consecutive slot suggestions
 * - Ignores CLIENT_MEETING sessions
 * - Falls back to default suggestions if no patterns are detected
 *
 * Performance optimizations:
 * - Single query to fetch all sessions (no N+1)
 * - Pattern detection done in-memory (efficient for typical user session counts)
 * - Conflict checking done per-suggestion (necessary for accuracy)
 */
export const suggestTimeSlots = async (
  database: typeof db,
  userId: string,
  options:
    | SuggestionOptions
    | { startDate?: Date; lookAheadDays?: number } = {},
  cachedTimezone?: string,
): Promise<SuggestedSession[]> =>
  withErrorHandling(
    async () => {
      // Use cached timezone if available (should always be provided by middleware)
      // Only fetch if not provided (defensive fallback)
      let userTimezone = cachedTimezone;
      if (!userTimezone) {
        const profile = await database.query.Profile.findFirst({
          where: eq(Profile.userId, userId),
        });
        userTimezone = getUserTimezone(profile?.timezone ?? null);
      }

      // Validate timezone to prevent runtime errors
      if (!isValidTimezone(userTimezone)) {
        throw new Error(`Invalid timezone: ${userTimezone}`);
      }

      // Set defaults early (before any early returns)
      const startDateDefault = options.startDate ?? new Date();

      // Validate startDate if provided
      if (options.startDate && isNaN(options.startDate.getTime())) {
        throw new Error("Invalid startDate provided");
      }

      // Validate and set lookAheadDays
      const lookAheadDaysDefault =
        options.lookAheadDays ?? SUGGESTION_CONSTANTS.DEFAULT_LOOK_AHEAD_DAYS;

      if (
        lookAheadDaysDefault < SUGGESTION_CONSTANTS.MIN_LOOK_AHEAD_DAYS ||
        lookAheadDaysDefault > SUGGESTION_CONSTANTS.MAX_LOOK_AHEAD_DAYS
      ) {
        throw new Error(
          `lookAheadDays must be between ${SUGGESTION_CONSTANTS.MIN_LOOK_AHEAD_DAYS} and ${SUGGESTION_CONSTANTS.MAX_LOOK_AHEAD_DAYS}`,
        );
      }

      // Get user's availability (JSON structure)
      const availability = await database.query.Availability.findFirst({
        where: eq(Availability.userId, userId),
      });

      if (!availability?.weeklyAvailability) {
        // No availability set, return empty suggestions
        return [];
      }

      // Calculate date range for session fetching
      // Only fetch sessions from the past year (for pattern detection) and future sessions
      // This prevents loading all sessions for users with many historical sessions
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - DATE_CONSTANTS.MS_PER_YEAR);
      const maxFutureDate = new Date(
        startDateDefault.getTime() +
          lookAheadDaysDefault * DATE_CONSTANTS.MS_PER_DAY,
      );

      // Optimized: Fetch only relevant sessions
      // - Past year: for pattern detection (completed sessions)
      // - Future: for conflict checking (active sessions)
      // Limit to prevent memory issues
      // This reduces memory usage and improves performance for users with many sessions
      const allSessions = await database.query.Session.findMany({
        where: and(
          eq(Session.userId, userId),
          isNull(Session.deletedAt),
          // Include sessions from past year (for pattern detection) or future (for conflict checking)
          gte(Session.startTime, oneYearAgo),
          // Limit to reasonable future date
          lt(Session.startTime, maxFutureDate),
        ),
        orderBy: [Session.startTime],
        limit: REQUEST_CONSTANTS.MAX_SESSIONS_FOR_SUGGESTIONS,
      });

      if (allSessions.length === 0) {
        // No sessions, generate defaults
        return await generateDefaultSuggestions(
          database,
          userId,
          availability.weeklyAvailability,
          userTimezone,
          [],
          startDateDefault,
          lookAheadDaysDefault,
        );
      }

      // Filter to completed sessions (excluding CLIENT_MEETING) for pattern detection
      // Also get active sessions in same pass
      const completedSessions: typeof allSessions = [];
      const activeSessions: typeof allSessions = [];
      for (const session of allSessions) {
        if (session.completed && session.type !== "CLIENT_MEETING") {
          completedSessions.push(session);
        }
        if (!session.completed) {
          activeSessions.push(session);
        }
      }

      // Detect repeating patterns from past sessions
      const patterns = detectPatterns(
        completedSessions.map((s) => ({
          type: s.type,
          title: s.title,
          startTime: s.startTime,
          endTime: s.endTime,
          priority: s.priority,
        })),
        userTimezone,
      );

      // If no patterns detected, generate default suggestions
      if (patterns.length === 0) {
        return await generateDefaultSuggestions(
          database,
          userId,
          availability.weeklyAvailability,
          userTimezone,
          activeSessions.map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
          })),
          startDateDefault,
          lookAheadDaysDefault,
        );
      }

      const suggestions = await generateSuggestionsFromPatterns(
        database,
        userId,
        patterns,
        userTimezone,
        activeSessions,
        startDateDefault,
        lookAheadDaysDefault,
      );

      return filterAndLimitSuggestions(suggestions);
    },
    "suggest time slots",
    {
      userId,
      startDate: options.startDate?.toISOString(),
      lookAheadDays: options.lookAheadDays,
      timezone: cachedTimezone ?? "UTC",
    },
  );
