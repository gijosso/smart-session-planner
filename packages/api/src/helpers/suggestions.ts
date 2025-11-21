import type { db } from "@ssp/db/client";
import type {
  DayOfWeek,
  SessionType,
  WeeklyAvailability,
} from "@ssp/db/schema";
import { and, eq, sql } from "@ssp/db";
import { Availability, Session } from "@ssp/db/schema";

import { TIME_CONVERSIONS } from "../constants/date";
import {
  DAY_ORDER,
  DEFAULT_SESSION,
  FATIGUE_SCORING,
  SCORING,
  SESSION_SPACING,
  SUGGESTION_LIMITS,
} from "../constants/suggestions";
import {
  convertLocalTimeToUTC,
  getDateForDayOfWeek,
  hoursBetween,
  timeToMinutes,
} from "../utils/date";
import { isWithinAvailability } from "./suggestions/availability";
import { detectPatterns } from "./suggestions/pattern-detection";
import {
  calculateDayFatigue,
  calculatePatternScore,
  calculateSpacingScore,
} from "./suggestions/scoring";

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
  preferredTypes?: SessionType[]; // Optional: prefer these session types
  minPriority?: number; // Optional: minimum priority to consider (1-5)
  maxPriority?: number; // Optional: maximum priority to consider (1-5)
}

/**
 * Session type display labels
 */

/**
 * Session type display labels
 */
const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  DEEP_WORK: "Deep Work",
  WORKOUT: "Workout",
  LANGUAGE: "Language",
  MEDITATION: "Meditation",
  CLIENT_MEETING: "Client Meeting",
  STUDY: "Study",
  READING: "Reading",
  OTHER: "Other",
};

/**
 * Check if a time slot conflicts with active sessions (in-memory)
 * Two sessions overlap if: start1 < end2 AND start2 < end1
 */
function hasConflictWithSessions(
  slotStart: Date,
  slotEnd: Date,
  activeSessions: {
    startTime: Date;
    endTime: Date;
    priority: number;
  }[],
): boolean {
  return activeSessions.some(
    (session) => session.startTime < slotEnd && slotStart < session.endTime,
  );
}

/**
 * Generate default suggestions when no patterns are detected
 * Improved: Better distribution and availability checking
 */
async function generateDefaultSuggestions(
  database: typeof db,
  userId: string,
  weeklyAvailability: WeeklyAvailability,
  userTimezone: string,
  activeSessions: {
    startTime: Date;
    endTime: Date;
    priority: number;
  }[],
  startDate: Date,
  lookAheadDays: number,
  options: SuggestionOptions,
): Promise<SuggestedSession[]> {
  // Default session types (excluding CLIENT_MEETING)
  const defaultTypes: SessionType[] = options.preferredTypes ?? [
    "DEEP_WORK",
    "WORKOUT",
    "LANGUAGE",
  ];

  // Convert availability to array format
  const availabilityWindows: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
  }[] = [];

  const dayOrder: Record<string, number> = DAY_ORDER;

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
    return (
      (dayOrder[a.dayOfWeek] ?? DAY_ORDER.UNDEFINED_FALLBACK) -
      (dayOrder[b.dayOfWeek] ?? DAY_ORDER.UNDEFINED_FALLBACK)
    );
  });

  if (availabilityWindows.length === 0) {
    return [];
  }

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

  // Generate suggestions for each type, distributed across days
  for (let typeIndex = 0; typeIndex < defaultTypes.length; typeIndex++) {
    const type = defaultTypes[typeIndex];
    if (!type) continue;
    const title = SESSION_TYPE_LABELS[type];

    // Check priority filter
    const defaultPriority = DEFAULT_SESSION.PRIORITY;
    if (options.minPriority && defaultPriority < options.minPriority) continue;
    if (options.maxPriority && defaultPriority > options.maxPriority) continue;

    let found = false;
    const today = new Date(startDate);
    today.setHours(0, 0, 0, 0);

    // Try to distribute suggestions across different days
    for (
      let dayOffset = typeIndex;
      dayOffset < lookAheadDays;
      dayOffset += SUGGESTION_LIMITS.DEFAULT_SUGGESTION_DAY_OFFSET
    ) {
      if (found) break;

      const candidateDate = new Date(today);
      candidateDate.setDate(candidateDate.getDate() + dayOffset);

      // Skip if in the past
      if (candidateDate < today) continue;

      const candidateDayOfWeek = getDayOfWeekFromDate(candidateDate);
      const windowsForDay = availabilityWindows.filter(
        (w) => w.dayOfWeek === candidateDayOfWeek,
      );

      // Check day fatigue
      const fatigue = calculateDayFatigue(candidateDate, activeSessions);
      if (fatigue.fatigueScore > FATIGUE_SCORING.SKIP_DAY_THRESHOLD) continue;

      for (const window of windowsForDay) {
        if (found) break;

        const windowStartMinutes = timeToMinutes(window.startTime);
        const windowEndMinutes = timeToMinutes(window.endTime);
        const durationMinutes = DEFAULT_SESSION.DURATION_MINUTES;

        if (windowEndMinutes - windowStartMinutes < durationMinutes) {
          continue;
        }

        // Try middle of window for better distribution
        const slotStartMinutes =
          windowStartMinutes +
          Math.floor(
            (windowEndMinutes - windowStartMinutes - durationMinutes) / 2,
          );

        const slotStartHours = Math.floor(
          slotStartMinutes / TIME_CONVERSIONS.MINUTES_PER_HOUR,
        );
        const slotStartMins =
          slotStartMinutes % TIME_CONVERSIONS.MINUTES_PER_HOUR;

        const slotStart = convertLocalTimeToUTC(
          candidateDate,
          slotStartHours,
          slotStartMins,
          userTimezone,
        );

        const slotEnd = new Date(slotStart);
        slotEnd.setTime(
          slotEnd.getTime() + durationMinutes * TIME_CONVERSIONS.MS_PER_MINUTE,
        );

        // Skip if in the past
        if (slotStart < new Date()) {
          continue;
        }

        // Check availability
        const availabilityCheck = isWithinAvailability(
          slotStart,
          slotEnd,
          weeklyAvailability,
          userTimezone,
        );
        if (!availabilityCheck.valid) {
          continue;
        }

        // Check for conflicts (in-memory, no database query)
        if (hasConflictWithSessions(slotStart, slotEnd, activeSessions)) {
          continue;
        }

        // Calculate spacing score (includes spacing from other suggestions)
        const spacingResult = calculateSpacingScore(
          slotStart,
          slotEnd,
          defaultPriority,
          activeSessions,
          suggestions,
        );

        // Found a valid slot
        // Normalize spacing score and combine with base score
        const normalizedSpacing = Math.max(
          SCORING.MIN_SCORE,
          Math.min(SCORING.MAX_SCORE, spacingResult.score),
        );
        const finalScore = Math.round(
          SCORING.BASE_DEFAULT_SCORE * 0.7 + normalizedSpacing * 0.3,
        );

        suggestions.push({
          title,
          type,
          startTime: slotStart,
          endTime: slotEnd,
          priority: defaultPriority,
          description: undefined,
          score: Math.max(
            SCORING.MIN_SCORE,
            Math.min(SCORING.MAX_SCORE, finalScore),
          ),
          reasons: [
            "Default suggestion to get you started",
            ...spacingResult.reasons,
          ],
        });

        found = true;
      }
    }
  }

  return suggestions;
}

/**
 * Generate smart time slot suggestions based on repeating task patterns
 * Revamped algorithm with:
 * - Better availability checking
 * - Priority-based fatigue heuristic
 * - Improved spacing logic
 * - Better scoring system
 */
/**
 * Generate smart time slot suggestions based on repeating task patterns
 */
export async function suggestTimeSlots(
  database: typeof db,
  userId: string,
  options: SuggestionOptions = {},
  timezone: string,
): Promise<SuggestedSession[]> {
  const userTimezone = timezone;

  // Get user's availability
  const availability = await database.query.Availability.findFirst({
    where: eq(Availability.userId, userId),
  });

  if (!availability?.weeklyAvailability) {
    return [];
  }

  // Batch queries: Get completed sessions for pattern detection and active sessions for conflicts
  // Filter at database level for better performance
  const [completedSessionsResult, activeSessionsResult] = await Promise.all([
    // Get completed sessions (excluding CLIENT_MEETING) for pattern detection
    database.query.Session.findMany({
      where: and(
        eq(Session.userId, userId),
        sql`${Session.deletedAt} IS NULL`,
        eq(Session.completed, true),
        sql`${Session.type} != 'CLIENT_MEETING'`,
      ),
    }),
    // Get active (non-completed) sessions for conflict checking and fatigue calculation
    database.query.Session.findMany({
      where: and(
        eq(Session.userId, userId),
        sql`${Session.deletedAt} IS NULL`,
        eq(Session.completed, false),
      ),
    }),
  ]);

  // Detect repeating patterns from past sessions
  const patterns = detectPatterns(
    completedSessionsResult.map((s) => ({
      type: s.type,
      title: s.title,
      startTime: s.startTime,
      endTime: s.endTime,
      priority: s.priority,
      completed: s.completed,
    })),
    userTimezone,
  );

  // Map active sessions for conflict checking and fatigue calculation
  const activeSessions = activeSessionsResult.map((s) => ({
    startTime: s.startTime,
    endTime: s.endTime,
    priority: s.priority,
  }));

  /**
   * Check if a time slot conflicts with active sessions (in-memory)
   * Two sessions overlap if: start1 < end2 AND start2 < end1
   */
  const hasConflict = (slotStart: Date, slotEnd: Date): boolean => {
    return activeSessions.some(
      (session) =>
        session.startTime < slotEnd && slotStart < session.endTime,
    );
  };

  // Set defaults
  const startDate = options.startDate ?? new Date();
  const lookAheadDays =
    options.lookAheadDays ?? SUGGESTION_LIMITS.DEFAULT_LOOKAHEAD_DAYS;

  // Validate inputs
  if (lookAheadDays < SUGGESTION_LIMITS.MIN_LOOKAHEAD_DAYS) {
    return [];
  }
  if (lookAheadDays > SUGGESTION_LIMITS.MAX_LOOKAHEAD_DAYS) {
    return [];
  }
  if (startDate < new Date()) {
    // If start date is in the past, use now instead
    startDate.setTime(new Date().getTime());
  }

  // If no patterns detected, generate default suggestions
  if (patterns.length === 0) {
    return generateDefaultSuggestions(
      database,
      userId,
      availability.weeklyAvailability,
      userTimezone,
      activeSessions,
      startDate,
      lookAheadDays,
      options,
    );
  }

  const suggestions: SuggestedSession[] = [];

  // Generate suggestions based on detected patterns
  for (const pattern of patterns) {
    // Check type filter
    if (
      options.preferredTypes &&
      !options.preferredTypes.includes(pattern.type)
    ) {
      continue;
    }

    // Check priority filter
    if (options.minPriority && pattern.priority < options.minPriority) continue;
    if (options.maxPriority && pattern.priority > options.maxPriority) continue;

    // Calculate dates for this day of week within the look-ahead period
    const windowDate = getDateForDayOfWeek(
      startDate,
      pattern.dayOfWeek,
      userTimezone,
    );

    // Generate suggestions for each week in the look-ahead period
    for (
      let weekOffset = 0;
      weekOffset < Math.ceil(lookAheadDays / SUGGESTION_LIMITS.DAYS_IN_WEEK);
      weekOffset++
    ) {
      const candidateDate = new Date(windowDate);
      candidateDate.setDate(
        candidateDate.getDate() + weekOffset * SUGGESTION_LIMITS.DAYS_IN_WEEK,
      );

      // Skip if beyond look-ahead period
      const daysFromStart = Math.floor(
        (candidateDate.getTime() - startDate.getTime()) /
          TIME_CONVERSIONS.MS_PER_DAY,
      );
      if (daysFromStart < 0 || daysFromStart > lookAheadDays) {
        continue;
      }

      // Skip if in the past
      if (candidateDate < new Date()) {
        continue;
      }

      // Convert pattern time to UTC Date
      const slotStart = convertLocalTimeToUTC(
        candidateDate,
        pattern.hour,
        pattern.minute,
        userTimezone,
      );

      const slotEnd = new Date(slotStart);
      slotEnd.setTime(
        slotEnd.getTime() +
          pattern.durationMinutes * TIME_CONVERSIONS.MS_PER_MINUTE,
      );

      // Skip if in the past
      if (slotStart < new Date()) {
        continue;
      }

      // Check availability
      const availabilityCheck = isWithinAvailability(
        slotStart,
        slotEnd,
        availability.weeklyAvailability,
        userTimezone,
      );
      if (!availabilityCheck.valid) {
        continue; // Skip slots outside availability
      }

      // Check for conflicts (in-memory, no database query)
      if (hasConflict(slotStart, slotEnd)) {
        continue; // Skip conflicting slots
      }

      // Calculate day fatigue
      const fatigue = calculateDayFatigue(candidateDate, activeSessions);

      // Calculate spacing score (includes spacing from other suggestions)
      const spacingResult = calculateSpacingScore(
        slotStart,
        slotEnd,
        pattern.priority,
        activeSessions,
        suggestions,
      );

      // Calculate days from now for scoring
      const daysFromNow = Math.floor(
        (slotStart.getTime() - new Date().getTime()) /
          TIME_CONVERSIONS.MS_PER_DAY,
      );

      // Calculate overall score using the scoring module
      // Spacing is already integrated into scoring, so no need for post-filtering
      const scoreResult = calculatePatternScore(
        {
          frequency: pattern.frequency,
          successRate: pattern.successRate,
          priority: pattern.priority,
          recencyWeight: pattern.recencyWeight,
        },
        spacingResult,
        fatigue,
        daysFromNow,
      );
      const reasons = [
        `Based on ${pattern.frequency} previous ${SESSION_TYPE_LABELS[pattern.type]} session${pattern.frequency > 1 ? "s" : ""}`,
        ...scoreResult.reasons,
      ];
      const score = scoreResult.score;

      suggestions.push({
        title: pattern.title,
        type: pattern.type,
        startTime: slotStart,
        endTime: slotEnd,
        priority: pattern.priority,
        description: undefined,
        score,
        reasons:
          reasons.length > 0 ? reasons : ["Based on your schedule patterns"],
      });
    }
  }

  // Sort by score (highest first)
  const sortedSuggestions = suggestions.sort((a, b) => b.score - a.score);

  // Enforce diversity across days/types and apply final limits
  // Spacing is already integrated into scoring, so we just need diversity filtering
  const filteredSuggestions: SuggestedSession[] = [];
  const selectedDays = new Map<string, number>(); // Track selected days (YYYY-MM-DD) -> count
  const selectedTypes = new Map<SessionType, number>(); // Track type counts

  for (const suggestion of sortedSuggestions) {
    // Check diversity constraints
    const suggestionDate = new Date(suggestion.startTime);
    const dateKey = `${suggestionDate.getFullYear()}-${String(suggestionDate.getMonth() + 1).padStart(2, "0")}-${String(suggestionDate.getDate()).padStart(2, "0")}`;
    const typeCount = selectedTypes.get(suggestion.type) ?? 0;
    const dayCount = selectedDays.get(dateKey) ?? 0;

    // Enforce diversity: max 2 suggestions per day, max 3 per type
    const maxPerDay = 2;
    const maxPerType = 3;

    if (dayCount >= maxPerDay) {
      continue; // Skip if day already has enough suggestions
    }

    if (typeCount >= maxPerType) {
      continue; // Skip if type already has enough suggestions
    }

    // Check spacing from already selected suggestions (additional safety check)
    const tooClose = filteredSuggestions.some((existing) => {
      const hoursDiff = hoursBetween(suggestion.startTime, existing.startTime);
      return hoursDiff < SESSION_SPACING.MIN_SPACING_HOURS;
    });

    if (tooClose) {
      continue; // Skip if too close (spacing should be handled in scoring, but double-check)
    }

    // Add suggestion
    filteredSuggestions.push(suggestion);
    selectedDays.set(dateKey, dayCount + 1);
    selectedTypes.set(suggestion.type, typeCount + 1);

    // Limit total suggestions
    if (filteredSuggestions.length >= SUGGESTION_LIMITS.MAX_SUGGESTIONS) {
      break;
    }
  }

  return filteredSuggestions;
}
