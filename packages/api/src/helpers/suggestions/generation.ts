import type { db } from "@ssp/db/client";
import type { DayOfWeek, SessionType } from "@ssp/db/schema";

import type { checkSessionConflicts, TimeRange } from "../session/conflicts";
import type { SessionPattern } from "./pattern-detection";
import type { SuggestedSession } from "./queries";
import {
  DATE_CONSTANTS,
  SESSION_TYPE_LABELS,
  SUGGESTION_CONSTANTS,
} from "../../utils/constants";
import {
  convertLocalTimeToUTC,
  getDateForDayOfWeek,
  isValidTimezone,
  timeToMinutes,
} from "../../utils/date";
import { withErrorHandling } from "../../utils/error";
import { logger } from "../../utils/logger";
import { checkSessionConflictsBatch } from "../session/conflicts";
import { calculateSuggestionScore } from "./scoring";

/**
 * Generate default suggestions when no patterns are detected
 * Creates 3 suggestions with different types, spread across availability windows
 */
export const generateDefaultSuggestions = async (
  database: typeof db,
  userId: string,
  weeklyAvailability: Record<string, { startTime: string; endTime: string }[]>,
  userTimezone: string,
  activeSessions: { startTime: Date; endTime: Date }[],
  startDate: Date,
  lookAheadDays: number,
): Promise<SuggestedSession[]> =>
  withErrorHandling(
    async () => {
      // Validate inputs
      if (!isValidTimezone(userTimezone)) {
        throw new Error(`Invalid timezone: ${userTimezone}`);
      }
      if (isNaN(startDate.getTime())) {
        throw new Error("Invalid startDate provided");
      }
      if (lookAheadDays < 1 || lookAheadDays > 30) {
        throw new Error("lookAheadDays must be between 1 and 30");
      }
      // Default session types (excluding CLIENT_MEETING)
      const defaultTypes: SessionType[] = ["DEEP_WORK", "WORKOUT", "LANGUAGE"];

      // Convert availability to array format
      const availabilityWindows: {
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
      }[] = [];

      const dayOrder: Record<string, number> = {
        MONDAY: 0,
        TUESDAY: 1,
        WEDNESDAY: 2,
        THURSDAY: 3,
        FRIDAY: 4,
        SATURDAY: 5,
        SUNDAY: 6,
      };

      for (const [dayOfWeek, windows] of Object.entries(weeklyAvailability)) {
        if (!Array.isArray(windows)) continue;
        for (const window of windows) {
          if (
            window.startTime &&
            window.endTime &&
            dayOrder[dayOfWeek] !== undefined
          ) {
            availabilityWindows.push({
              dayOfWeek: dayOfWeek as DayOfWeek,
              startTime: window.startTime,
              endTime: window.endTime,
            });
          }
        }
      }

      // Sort by day of week
      availabilityWindows.sort((a, b) => {
        return (dayOrder[a.dayOfWeek] ?? 99) - (dayOrder[b.dayOfWeek] ?? 99);
      });

      if (availabilityWindows.length === 0) {
        return [];
      }

      const defaultDurationMinutes =
        SUGGESTION_CONSTANTS.DEFAULT_SESSION_DURATION_MINUTES;
      const defaultPriority = SUGGESTION_CONSTANTS.DEFAULT_SESSION_PRIORITY;
      const suggestions: SuggestedSession[] = [];

      // Helper to get day of week name from a date in user's timezone
      const getDayOfWeekFromDate = (date: Date): DayOfWeek => {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: userTimezone,
          weekday: "long",
        });
        const weekday = formatter.format(date);
        const dayMap: Record<string, DayOfWeek> = {
          Monday: "MONDAY",
          Tuesday: "TUESDAY",
          Wednesday: "WEDNESDAY",
          Thursday: "THURSDAY",
          Friday: "FRIDAY",
          Saturday: "SATURDAY",
          Sunday: "SUNDAY",
        };
        return dayMap[weekday] ?? "MONDAY";
      };

      // Collect all candidate slots first, then batch check conflicts
      interface CandidateSlot {
        type: SessionType;
        title: string;
        startTime: Date;
        endTime: Date;
      }

      const candidateSlots: CandidateSlot[] = [];
      const now = new Date();

      // Generate candidate slots for all types
      for (let i = 0; i < Math.min(3, defaultTypes.length); i++) {
        const type = defaultTypes[i];
        if (!type) continue;
        const title = SESSION_TYPE_LABELS[type];

        const today = new Date(startDate);
        today.setHours(0, 0, 0, 0);

        for (let dayOffset = 0; dayOffset < lookAheadDays; dayOffset++) {
          const candidateDate = new Date(today);
          candidateDate.setDate(candidateDate.getDate() + dayOffset);

          const candidateDayOfWeek = getDayOfWeekFromDate(candidateDate);
          const windowsForDay = availabilityWindows.filter(
            (w) => w.dayOfWeek === candidateDayOfWeek,
          );

          for (const window of windowsForDay) {
            const windowStartMinutes = timeToMinutes(window.startTime);
            const windowEndMinutes = timeToMinutes(window.endTime);

            if (
              windowEndMinutes - windowStartMinutes <
              defaultDurationMinutes
            ) {
              continue;
            }

            const oneHourInMinutes = 60;
            const timeSlots = [
              windowStartMinutes + oneHourInMinutes,
              windowStartMinutes +
                Math.floor((windowEndMinutes - windowStartMinutes) / 2),
              windowEndMinutes - defaultDurationMinutes - oneHourInMinutes,
            ].filter(
              (minutes) =>
                minutes >= windowStartMinutes &&
                minutes + defaultDurationMinutes <= windowEndMinutes,
            );

            for (const slotStartMinutes of timeSlots) {
              const slotStartHours = Math.floor(slotStartMinutes / 60);
              const slotStartMins = slotStartMinutes % 60;

              const slotStart = convertLocalTimeToUTC(
                candidateDate,
                slotStartHours,
                slotStartMins,
                userTimezone,
              );

              const slotEnd = new Date(slotStart);
              slotEnd.setTime(
                slotEnd.getTime() +
                  defaultDurationMinutes * DATE_CONSTANTS.MS_PER_MINUTE,
              );

              // Skip if in the past
              if (slotStart < now) {
                continue;
              }

              candidateSlots.push({
                type,
                title,
                startTime: slotStart,
                endTime: slotEnd,
              });

              // Limit candidate slots to prevent memory issues and performance degradation
              // Stop generating once we reach the maximum
              if (
                candidateSlots.length >=
                (SUGGESTION_CONSTANTS.MAX_CANDIDATE_SLOTS as number)
              ) {
                break;
              }
            }
            // Break outer loops if limit reached
            if (
              candidateSlots.length >=
              (SUGGESTION_CONSTANTS.MAX_CANDIDATE_SLOTS as number)
            ) {
              break;
            }
          }
          // Break outer loops if limit reached
          if (
            candidateSlots.length >=
            (SUGGESTION_CONSTANTS.MAX_CANDIDATE_SLOTS as number)
          ) {
            break;
          }
        }
        // Break outer loops if limit reached
        if (
          candidateSlots.length >=
          (SUGGESTION_CONSTANTS.MAX_CANDIDATE_SLOTS as number)
        ) {
          break;
        }
      }

      // Early return if no candidate slots
      if (candidateSlots.length === 0) {
        return [];
      }

      // Batch check all conflicts in a single query
      let conflictsByIndex: Map<
        number,
        Awaited<ReturnType<typeof checkSessionConflicts>>
      >;
      try {
        const ranges: TimeRange[] = candidateSlots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        }));
        conflictsByIndex = await checkSessionConflictsBatch(
          database,
          userId,
          ranges,
        );
      } catch (error) {
        // Log error prominently and re-throw to prevent silent failures
        // This ensures errors are properly handled by withErrorHandling wrapper
        logger.error(
          "Failed to batch check conflicts for default suggestions",
          {
            userId,
            candidateCount: candidateSlots.length,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
        // Re-throw to let withErrorHandling handle it properly
        throw error;
      }

      // Process candidates and build suggestions
      for (let i = 0; i < candidateSlots.length; i++) {
        const candidate = candidateSlots[i];
        if (!candidate) continue;

        // Check if this candidate has conflicts
        const conflicts = conflictsByIndex.get(i) ?? [];
        if (conflicts.length > 0) {
          continue;
        }

        // Check spacing from other suggestions (prevent consecutive slots)
        // Optimized: Break early when limit is reached, reducing iterations
        // Also break early if we find a conflict (O(n) worst case, but often much better)
        let tooClose = false;
        for (const existing of suggestions) {
          const hoursDiff = Math.abs(
            (candidate.startTime.getTime() - existing.startTime.getTime()) /
              DATE_CONSTANTS.MS_PER_HOUR,
          );
          if (hoursDiff < SUGGESTION_CONSTANTS.MIN_SUGGESTION_SPACING_HOURS) {
            tooClose = true;
            break; // Early exit when conflict found
          }
        }

        if (tooClose) {
          continue;
        }

        // Found a valid slot
        suggestions.push({
          title: candidate.title,
          type: candidate.type,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          priority: defaultPriority,
          description: undefined,
          score: SUGGESTION_CONSTANTS.BASE_SCORE + 10,
          reasons: ["Default suggestion to get you started"],
        });

        // Limit to 3 suggestions (one per type)
        if (suggestions.length >= 3) {
          break;
        }
      }

      return suggestions;
    },
    "generate default suggestions",
    {
      userId,
      lookAheadDays,
      startDate: startDate.toISOString(),
    },
  );

/**
 * Generate suggestions from detected patterns
 */
export const generateSuggestionsFromPatterns = async (
  database: typeof db,
  userId: string,
  patterns: SessionPattern[],
  userTimezone: string,
  activeSessions: { startTime: Date; endTime: Date }[],
  startDate: Date,
  lookAheadDays: number,
): Promise<SuggestedSession[]> =>
  withErrorHandling(
    async () => {
      // Validate inputs
      if (!isValidTimezone(userTimezone)) {
        throw new Error(`Invalid timezone: ${userTimezone}`);
      }
      if (isNaN(startDate.getTime())) {
        throw new Error("Invalid startDate provided");
      }
      if (lookAheadDays < 1 || lookAheadDays > 30) {
        throw new Error("lookAheadDays must be between 1 and 30");
      }

      // Validate patterns array
      if (!Array.isArray(patterns)) {
        throw new Error("patterns must be a valid array");
      }
      if (patterns.length === 0) {
        return [];
      }

      // Validate activeSessions array
      if (!Array.isArray(activeSessions)) {
        throw new Error("activeSessions must be a valid array");
      }

      const suggestions: SuggestedSession[] = [];

      // Collect all candidate slots first, then batch check conflicts
      interface CandidatePatternSlot {
        pattern: SessionPattern;
        startTime: Date;
        endTime: Date;
      }

      const candidateSlots: CandidatePatternSlot[] = [];
      const now = new Date();

      // Generate candidate slots based on detected patterns
      for (const pattern of patterns) {
        const windowDate = getDateForDayOfWeek(
          startDate,
          pattern.dayOfWeek,
          userTimezone,
        );

        for (
          let weekOffset = 0;
          weekOffset < Math.ceil(lookAheadDays / 7);
          weekOffset++
        ) {
          const candidateDate = new Date(windowDate);
          candidateDate.setDate(candidateDate.getDate() + weekOffset * 7);

          const daysFromStart = Math.floor(
            (candidateDate.getTime() - startDate.getTime()) /
              DATE_CONSTANTS.MS_PER_DAY,
          );
          if (daysFromStart < 0 || daysFromStart > lookAheadDays) {
            continue;
          }

          const slotStart = convertLocalTimeToUTC(
            candidateDate,
            pattern.hour,
            pattern.minute,
            userTimezone,
          );

          const slotEnd = new Date(slotStart);
          slotEnd.setTime(
            slotEnd.getTime() +
              pattern.durationMinutes * DATE_CONSTANTS.MS_PER_MINUTE,
          );

          if (slotStart < now) {
            continue;
          }

          candidateSlots.push({
            pattern,
            startTime: slotStart,
            endTime: slotEnd,
          });

          // Limit candidate slots to prevent memory issues and performance degradation
          // Stop generating once we reach the maximum
          if (
            candidateSlots.length >=
            (SUGGESTION_CONSTANTS.MAX_CANDIDATE_SLOTS as number)
          ) {
            break;
          }
        }
        // Break outer loop if limit reached
        if (
          candidateSlots.length >=
          (SUGGESTION_CONSTANTS.MAX_CANDIDATE_SLOTS as number)
        ) {
          break;
        }
      }

      // Early return if no candidate slots
      if (candidateSlots.length === 0) {
        return [];
      }

      // Batch check all conflicts in a single query
      let conflictsByIndex: Map<
        number,
        Awaited<ReturnType<typeof checkSessionConflicts>>
      >;
      try {
        const ranges: TimeRange[] = candidateSlots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        }));
        conflictsByIndex = await checkSessionConflictsBatch(
          database,
          userId,
          ranges,
        );
      } catch (error) {
        // Log error prominently and re-throw to prevent silent failures
        // This ensures errors are properly handled by withErrorHandling wrapper
        logger.error(
          "Failed to batch check conflicts for pattern suggestions",
          {
            userId,
            candidateCount: candidateSlots.length,
            patternCount: patterns.length,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
        // Re-throw to let withErrorHandling handle it properly
        throw error;
      }

      // Process candidates and build suggestions
      for (let i = 0; i < candidateSlots.length; i++) {
        const candidate = candidateSlots[i];
        if (!candidate) continue;

        // Check if this candidate has conflicts
        const conflicts = conflictsByIndex.get(i) ?? [];
        if (conflicts.length > 0) {
          continue;
        }

        // Calculate score for this suggestion
        const scoreResult = calculateSuggestionScore(
          candidate.pattern,
          candidate.startTime,
          candidate.endTime,
          activeSessions.map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
          })),
          suggestions,
          SESSION_TYPE_LABELS,
        );

        suggestions.push({
          title: candidate.pattern.title,
          type: candidate.pattern.type,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          priority: candidate.pattern.priority,
          description: undefined,
          score: scoreResult.score,
          reasons:
            scoreResult.reasons.length > 0
              ? scoreResult.reasons
              : ["Based on your schedule patterns"],
        });
      }

      return suggestions;
    },
    "generate suggestions from patterns",
    {
      userId,
      patternCount: patterns.length,
      lookAheadDays,
      startDate: startDate.toISOString(),
    },
  );

/**
 * Filter and limit suggestions to prevent consecutive slots
 */
export function filterAndLimitSuggestions(
  suggestions: SuggestedSession[],
): SuggestedSession[] {
  // Sort by score (highest first)
  const sortedSuggestions = suggestions.sort((a, b) => b.score - a.score);

  // Filter out consecutive suggestions (prevent listing every slot after the other)
  const filteredSuggestions: SuggestedSession[] = [];
  const minSpacingHours = SUGGESTION_CONSTANTS.MIN_SUGGESTION_SPACING_HOURS;

  for (const suggestion of sortedSuggestions) {
    // Check if this suggestion is too close to any already selected suggestion
    const tooClose = filteredSuggestions.some((existing) => {
      const hoursDiff = Math.abs(
        (suggestion.startTime.getTime() - existing.startTime.getTime()) /
          DATE_CONSTANTS.MS_PER_HOUR,
      );
      return hoursDiff < minSpacingHours;
    });

    if (!tooClose) {
      filteredSuggestions.push(suggestion);
    }

    // Limit total suggestions
    if (filteredSuggestions.length >= SUGGESTION_CONSTANTS.MAX_SUGGESTIONS) {
      break;
    }
  }

  return filteredSuggestions;
}
