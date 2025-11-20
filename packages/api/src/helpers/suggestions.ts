import type { db } from "@ssp/db/client";
import type {
  DayOfWeek,
  SessionType,
  WeeklyAvailability,
} from "@ssp/db/schema";
import { and, eq, getUserTimezone, sql } from "@ssp/db";
import { Availability, Profile, Session } from "@ssp/db/schema";

import { TIME_CONVERSIONS } from "../constants/date";
import {
  DAILY_SESSION_LIMITS,
  DAY_ORDER,
  DEFAULT_SESSION,
  FATIGUE_SCORING,
  PATTERN_DETECTION,
  SCORING,
  SESSION_SPACING,
  SUGGESTION_LIMITS,
} from "../constants/suggestions";
import {
  convertLocalTimeToUTC,
  getDateForDayOfWeek,
  hoursBetween,
  isSameDay,
  timeRangesOverlap,
  timeToMinutes,
} from "../utils/date";
import { checkSessionConflicts } from "./session";

/**
 * Suggested session - returns the full shape of a session creation
 * This can be directly used to prefill a session creation form
 */
export interface SuggestedSession {
  id: string; // Unique ID for this suggestion (for accepting it later)
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
 * Pattern detected from past sessions
 */
interface SessionPattern {
  type: SessionType;
  dayOfWeek: DayOfWeek;
  hour: number; // Hour in user's timezone (0-23)
  minute: number; // Minute (0-59)
  durationMinutes: number; // Average duration
  priority: number; // Average priority
  frequency: number; // How many times this pattern occurred
  title: string; // Most common title for this pattern
  successRate: number; // Completion rate for this pattern (0-1)
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
 * Analyze past sessions to detect repeating patterns
 * Groups sessions by type, day of week, and time of day
 * Improved: Also tracks completion rate (success rate) for each pattern
 */
function detectPatterns(
  sessions: {
    type: SessionType;
    title: string;
    startTime: Date;
    endTime: Date;
    priority: number;
    completed: boolean;
  }[],
  userTimezone: string,
): SessionPattern[] {
  // Filter out CLIENT_MEETING sessions
  const filteredSessions = sessions.filter((s) => s.type !== "CLIENT_MEETING");

  // Group sessions by pattern key: type + dayOfWeek + hour
  const patternMap = new Map<
    string,
    SessionPattern & { completedCount: number }
  >();

  for (const session of filteredSessions) {
    // Get day of week and time in user's timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimezone,
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(session.startTime);
    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
    const hour = Number.parseInt(
      parts.find((p) => p.type === "hour")?.value ?? "0",
      10,
    );
    const minute = Number.parseInt(
      parts.find((p) => p.type === "minute")?.value ?? "0",
      10,
    );

    // Map weekday to DayOfWeek enum
    const dayOfWeekMap: Record<string, DayOfWeek> = {
      Monday: "MONDAY",
      Tuesday: "TUESDAY",
      Wednesday: "WEDNESDAY",
      Thursday: "THURSDAY",
      Friday: "FRIDAY",
      Saturday: "SATURDAY",
      Sunday: "SUNDAY",
    };
    const dayOfWeek = dayOfWeekMap[weekday];
    if (!dayOfWeek) continue;

    // Round to nearest 30 minutes for pattern matching (allows flexibility)
    const roundedHour = hour;
    const roundedMinute =
      minute < PATTERN_DETECTION.PATTERN_TIME_ROUNDING_MINUTES
        ? 0
        : PATTERN_DETECTION.PATTERN_TIME_ROUNDING_MINUTES;

    const durationMinutes = Math.round(
      (session.endTime.getTime() - session.startTime.getTime()) /
        TIME_CONVERSIONS.MS_PER_MINUTE,
    );

    const patternKey = `${session.type}-${dayOfWeek}-${roundedHour}-${roundedMinute}`;

    if (!patternMap.has(patternKey)) {
      patternMap.set(patternKey, {
        type: session.type,
        dayOfWeek,
        hour: roundedHour,
        minute: roundedMinute,
        durationMinutes,
        priority: session.priority,
        frequency: 1,
        completedCount: session.completed ? 1 : 0,
        title: session.title,
        successRate: session.completed ? 1 : 0,
      });
    } else {
      const pattern = patternMap.get(patternKey);
      if (pattern) {
        // Update averages
        pattern.durationMinutes = Math.round(
          (pattern.durationMinutes * pattern.frequency + durationMinutes) /
            (pattern.frequency + 1),
        );
        pattern.priority = Math.round(
          (pattern.priority * pattern.frequency + session.priority) /
            (pattern.frequency + 1),
        );
        pattern.frequency += 1;
        pattern.completedCount += session.completed ? 1 : 0;
        pattern.successRate = pattern.completedCount / pattern.frequency;
        // Use most common title (keep first one for now, could improve with frequency tracking)
      }
    }
  }

  // Return patterns sorted by frequency and success rate
  return Array.from(patternMap.values())
    .filter((p) => p.frequency >= PATTERN_DETECTION.MIN_PATTERN_FREQUENCY)
    .map(({ completedCount: _completedCount, ...pattern }) => pattern) // Remove completedCount from output
    .sort((a, b) => {
      // Sort by success rate first (higher is better), then frequency
      if (
        Math.abs(a.successRate - b.successRate) >
        PATTERN_DETECTION.SUCCESS_RATE_DIFFERENCE_THRESHOLD
      ) {
        return b.successRate - a.successRate;
      }
      return b.frequency - a.frequency;
    });
}

/**
 * Check if a time slot is within user's availability windows
 */
function isWithinAvailability(
  startTime: Date,
  endTime: Date,
  weeklyAvailability: WeeklyAvailability,
  userTimezone: string,
): { valid: boolean; reason?: string } {
  // Get day of week for the start time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: userTimezone,
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const startParts = formatter.formatToParts(startTime);
  const weekday = startParts.find((p) => p.type === "weekday")?.value ?? "";
  const startHour = Number.parseInt(
    startParts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const startMinute = Number.parseInt(
    startParts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );

  const endParts = formatter.formatToParts(endTime);
  const endHour = Number.parseInt(
    endParts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const endMinute = Number.parseInt(
    endParts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );

  const dayOfWeekMap: Record<string, DayOfWeek> = {
    Monday: "MONDAY",
    Tuesday: "TUESDAY",
    Wednesday: "WEDNESDAY",
    Thursday: "THURSDAY",
    Friday: "FRIDAY",
    Saturday: "SATURDAY",
    Sunday: "SUNDAY",
  };
  const dayOfWeek = dayOfWeekMap[weekday] as DayOfWeek | undefined;
  if (!dayOfWeek) {
    return { valid: false, reason: "Invalid day of week" };
  }

  const availabilityWindows = weeklyAvailability[dayOfWeek];
  // Type system guarantees availabilityWindows exists, but check length at runtime
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!availabilityWindows || availabilityWindows.length === 0) {
    return { valid: false, reason: `No availability set for ${weekday}` };
  }

  const startTimeStr = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}:00`;
  const endTimeStr = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00`;

  // Check if the session time overlaps with any availability window
  for (const window of availabilityWindows) {
    if (
      timeRangesOverlap(
        startTimeStr,
        endTimeStr,
        window.startTime,
        window.endTime,
      )
    ) {
      // Check if session is fully within the window
      const windowStartMin = timeToMinutes(window.startTime);
      const windowEndMin = timeToMinutes(window.endTime);
      const sessionStartMin = timeToMinutes(startTimeStr);
      const sessionEndMin = timeToMinutes(endTimeStr);

      if (sessionStartMin >= windowStartMin && sessionEndMin <= windowEndMin) {
        return { valid: true };
      }
    }
  }

  return { valid: false, reason: "Outside availability windows" };
}

/**
 * Calculate fatigue score for a day based on existing sessions
 * Penalizes days with too many high-priority sessions
 */
function calculateDayFatigue(
  date: Date,
  existingSessions: {
    startTime: Date;
    endTime: Date;
    priority: number;
  }[],
  _userTimezone: string,
): { fatigueScore: number; reasons: string[] } {
  const reasons: string[] = [];
  let fatigueScore = 0;

  // Get all sessions on this day
  const daySessions = existingSessions.filter((session) =>
    isSameDay(session.startTime, date),
  );

  if (daySessions.length === 0) {
    return { fatigueScore: 0, reasons: [] };
  }

  // Count high-priority sessions
  const highPriorityCount = daySessions.filter(
    (s) => s.priority >= DAILY_SESSION_LIMITS.HIGH_PRIORITY_THRESHOLD,
  ).length;

  // Penalty for too many high-priority sessions
  if (highPriorityCount > DAILY_SESSION_LIMITS.MAX_HIGH_PRIORITY_PER_DAY) {
    const excess =
      highPriorityCount - DAILY_SESSION_LIMITS.MAX_HIGH_PRIORITY_PER_DAY;
    fatigueScore += excess * FATIGUE_SCORING.PENALTY_PER_HIGH_PRIORITY;
    reasons.push(
      `${highPriorityCount} high-priority sessions already scheduled (max ${DAILY_SESSION_LIMITS.MAX_HIGH_PRIORITY_PER_DAY})`,
    );
  }

  // Penalty for too many total sessions
  if (daySessions.length >= DAILY_SESSION_LIMITS.MAX_TOTAL_SESSIONS_PER_DAY) {
    fatigueScore += FATIGUE_SCORING.TOO_MANY_SESSIONS_PENALTY;
    reasons.push(
      `${daySessions.length} sessions already scheduled (max ${DAILY_SESSION_LIMITS.MAX_TOTAL_SESSIONS_PER_DAY})`,
    );
  }

  return { fatigueScore, reasons };
}

/**
 * Calculate spacing score for a time slot
 * Improved: Better spacing logic and considers priority
 */
function calculateSpacingScore(
  proposedStart: Date,
  proposedEnd: Date,
  proposedPriority: number,
  existingSessions: {
    startTime: Date;
    endTime: Date;
    priority: number;
  }[],
  otherSuggestions: SuggestedSession[],
  _userTimezone: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = SCORING.BASE_SPACING_SCORE;

  // Check sessions on the same day
  const sameDaySessions = existingSessions.filter((session) =>
    isSameDay(session.startTime, proposedStart),
  );

  // Check spacing between sessions
  for (const session of sameDaySessions) {
    const hoursBefore = hoursBetween(proposedStart, session.endTime);
    const hoursAfter = hoursBetween(session.startTime, proposedEnd);

    // Check if sessions overlap (shouldn't happen, but safety check)
    if (hoursBefore < 0 && hoursAfter < 0) {
      score -= SCORING.OVERLAP_PENALTY;
      reasons.push("Overlaps with existing session");
      continue;
    }

    // Penalty for too close spacing
    if (hoursBefore >= 0 && hoursBefore < SESSION_SPACING.MIN_SPACING_HOURS) {
      const penalty = Math.round(
        (1 - hoursBefore / SESSION_SPACING.MIN_SPACING_HOURS) *
          SCORING.SPACING_PENALTY_MULTIPLIER,
      );
      score -= penalty;
      reasons.push(
        `Only ${Math.round(hoursBefore * 10) / 10}h after previous session`,
      );
    }
    if (hoursAfter >= 0 && hoursAfter < SESSION_SPACING.MIN_SPACING_HOURS) {
      const penalty = Math.round(
        (1 - hoursAfter / SESSION_SPACING.MIN_SPACING_HOURS) *
          SCORING.SPACING_PENALTY_MULTIPLIER,
      );
      score -= penalty;
      reasons.push(
        `Only ${Math.round(hoursAfter * 10) / 10}h before next session`,
      );
    }

    // Bonus for ideal spacing
    if (
      hoursBefore >= SESSION_SPACING.IDEAL_SPACING_HOURS &&
      hoursBefore <
        SESSION_SPACING.IDEAL_SPACING_HOURS +
          SESSION_SPACING.IDEAL_SPACING_BONUS_RANGE_HOURS
    ) {
      score += SCORING.IDEAL_SPACING_BONUS;
      reasons.push("Good spacing from previous session");
    }
    if (
      hoursAfter >= SESSION_SPACING.IDEAL_SPACING_HOURS &&
      hoursAfter <
        SESSION_SPACING.IDEAL_SPACING_HOURS +
          SESSION_SPACING.IDEAL_SPACING_BONUS_RANGE_HOURS
    ) {
      score += SCORING.IDEAL_SPACING_BONUS;
      reasons.push("Good spacing before next session");
    }

    // Extra penalty if both sessions are high priority and too close
    if (
      proposedPriority >= DAILY_SESSION_LIMITS.HIGH_PRIORITY_THRESHOLD &&
      session.priority >= DAILY_SESSION_LIMITS.HIGH_PRIORITY_THRESHOLD &&
      (hoursBefore < SESSION_SPACING.IDEAL_SPACING_HOURS ||
        hoursAfter < SESSION_SPACING.IDEAL_SPACING_HOURS)
    ) {
      score -= SCORING.HIGH_PRIORITY_CLOSE_PENALTY;
      reasons.push("High-priority sessions too close together");
    }
  }

  // Check spacing from other suggestions
  for (const suggestion of otherSuggestions) {
    const hoursBefore = hoursBetween(proposedStart, suggestion.endTime);
    const hoursAfter = hoursBetween(suggestion.startTime, proposedEnd);

    if (
      hoursBefore >= 0 &&
      hoursBefore < SESSION_SPACING.MIN_SUGGESTION_SPACING_HOURS
    ) {
      score -= SCORING.CONSECUTIVE_SUGGESTION_PENALTY;
      reasons.push("Too close to another suggestion");
    }
    if (
      hoursAfter >= 0 &&
      hoursAfter < SESSION_SPACING.MIN_SUGGESTION_SPACING_HOURS
    ) {
      score -= SCORING.CONSECUTIVE_SUGGESTION_PENALTY;
      reasons.push("Too close to another suggestion");
    }
  }

  return {
    score: Math.max(SCORING.MIN_SCORE, Math.min(SCORING.MAX_SCORE, score)),
    reasons,
  };
}

/**
 * Generate a unique suggestion ID
 */
function generateSuggestionId(): string {
  return `suggestion_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
      const fatigue = calculateDayFatigue(
        candidateDate,
        activeSessions,
        userTimezone,
      );
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

        // Check for conflicts
        let conflicts: Awaited<ReturnType<typeof checkSessionConflicts>>;
        try {
          conflicts = await checkSessionConflicts(
            database,
            userId,
            slotStart,
            slotEnd,
          );
        } catch (error) {
          // Log error but continue - if conflict check fails, skip this slot
          // rather than failing entire suggestion generation
          console.error(
            `[SUGGESTIONS] Failed to check conflicts for slot:`,
            error instanceof Error ? error.message : String(error),
          );
          continue;
        }

        if (conflicts.length > 0) {
          continue;
        }

        // Check spacing from other suggestions
        const tooClose = suggestions.some((existing) => {
          const hoursDiff = hoursBetween(slotStart, existing.startTime);
          return hoursDiff < SESSION_SPACING.MIN_SPACING_HOURS;
        });

        if (tooClose) {
          continue;
        }

        // Calculate spacing score
        const spacingResult = calculateSpacingScore(
          slotStart,
          slotEnd,
          defaultPriority,
          activeSessions,
          suggestions,
          userTimezone,
        );

        // Found a valid slot
        suggestions.push({
          id: generateSuggestionId(),
          title,
          type,
          startTime: slotStart,
          endTime: slotEnd,
          priority: defaultPriority,
          description: undefined,
          score:
            SCORING.BASE_DEFAULT_SCORE + Math.floor(spacingResult.score / 2), // Base score + spacing
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
export async function suggestTimeSlots(
  database: typeof db,
  userId: string,
  options: SuggestionOptions = {},
): Promise<SuggestedSession[]> {
  // Get user's profile for timezone
  const profile = await database.query.Profile.findFirst({
    where: eq(Profile.userId, userId),
  });
  const userTimezone = getUserTimezone(profile?.timezone ?? null);

  // Get user's availability
  const availability = await database.query.Availability.findFirst({
    where: eq(Availability.userId, userId),
  });

  if (!availability?.weeklyAvailability) {
    return [];
  }

  // Get all sessions (filter at database level for better performance)
  const allSessions = await database.query.Session.findMany({
    where: and(eq(Session.userId, userId), sql`${Session.deletedAt} IS NULL`),
  });

  // Filter to completed sessions (excluding CLIENT_MEETING) for pattern detection
  const completedSessions = allSessions.filter(
    (s) => s.completed && s.type !== "CLIENT_MEETING",
  );

  // Detect repeating patterns from past sessions
  const patterns = detectPatterns(
    completedSessions.map((s) => ({
      type: s.type,
      title: s.title,
      startTime: s.startTime,
      endTime: s.endTime,
      priority: s.priority,
      completed: s.completed,
    })),
    userTimezone,
  );

  // Get existing active sessions for conflict checking and fatigue calculation
  const activeSessions = allSessions
    .filter((s) => !s.completed)
    .map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      priority: s.priority,
    }));

  // Set defaults
  const startDate = options.startDate ?? new Date();
  const lookAheadDays =
    options.lookAheadDays ?? SUGGESTION_LIMITS.DEFAULT_LOOKAHEAD_DAYS;

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

      // Check for conflicts
      let conflicts: Awaited<ReturnType<typeof checkSessionConflicts>>;
      try {
        conflicts = await checkSessionConflicts(
          database,
          userId,
          slotStart,
          slotEnd,
        );
      } catch (error) {
        // Log error but continue - if conflict check fails, skip this slot
        // rather than failing entire suggestion generation
        console.error(
          `[SUGGESTIONS] Failed to check conflicts for slot:`,
          error instanceof Error ? error.message : String(error),
        );
        continue;
      }

      if (conflicts.length > 0) {
        continue; // Skip conflicting slots
      }

      // Calculate day fatigue
      const fatigue = calculateDayFatigue(
        candidateDate,
        activeSessions,
        userTimezone,
      );

      // Calculate spacing score
      const spacingResult = calculateSpacingScore(
        slotStart,
        slotEnd,
        pattern.priority,
        activeSessions,
        suggestions,
        userTimezone,
      );

      // Calculate overall score
      const reasons: string[] = [];
      let score: number = SCORING.BASE_PATTERN_SCORE;

      // Pattern frequency bonus (more frequent patterns score higher)
      const frequencyBonus = Math.min(
        pattern.frequency * SCORING.FREQUENCY_BONUS_MULTIPLIER,
        SCORING.MAX_FREQUENCY_BONUS,
      );
      score += frequencyBonus;
      reasons.push(
        `Based on ${pattern.frequency} previous ${SESSION_TYPE_LABELS[pattern.type]} session${pattern.frequency > 1 ? "s" : ""}`,
      );

      // Success rate bonus (patterns with high completion rate score higher)
      const successBonus = Math.round(
        pattern.successRate * SCORING.SUCCESS_RATE_BONUS_MULTIPLIER,
      );
      score += successBonus;
      if (pattern.successRate > PATTERN_DETECTION.HIGH_SUCCESS_RATE_THRESHOLD) {
        reasons.push("High completion rate for this pattern");
      }

      // Spacing score (weighted)
      score += Math.floor(spacingResult.score * SCORING.SPACING_SCORE_WEIGHT);
      reasons.push(...spacingResult.reasons);

      // Fatigue penalty
      score -= fatigue.fatigueScore;
      reasons.push(...fatigue.reasons);

      // Bonus for earlier dates (sooner is better, but not too much)
      const daysFromNow = Math.floor(
        (slotStart.getTime() - new Date().getTime()) /
          TIME_CONVERSIONS.MS_PER_DAY,
      );
      if (daysFromNow <= SUGGESTION_LIMITS.NEAR_TERM_BONUS_DAYS) {
        score += SCORING.NEAR_TERM_BONUS;
        reasons.push("Available soon");
      }

      // Priority bonus (higher priority patterns get slight bonus, but fatigue already penalizes clustering)
      if (pattern.priority >= DAILY_SESSION_LIMITS.HIGH_PRIORITY_THRESHOLD) {
        score += SCORING.HIGH_PRIORITY_BONUS;
      }

      // Ensure score is within bounds
      score = Math.max(SCORING.MIN_SCORE, Math.min(SCORING.MAX_SCORE, score));

      suggestions.push({
        id: generateSuggestionId(),
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

  // Filter out consecutive suggestions and apply final limits
  const filteredSuggestions: SuggestedSession[] = [];

  for (const suggestion of sortedSuggestions) {
    // Check if this suggestion is too close to any already selected suggestion
    const tooClose = filteredSuggestions.some((existing) => {
      const hoursDiff = hoursBetween(suggestion.startTime, existing.startTime);
      return hoursDiff < SESSION_SPACING.MIN_SPACING_HOURS;
    });

    if (!tooClose) {
      filteredSuggestions.push(suggestion);
    }

    // Limit total suggestions
    if (filteredSuggestions.length >= SUGGESTION_LIMITS.MAX_SUGGESTIONS) {
      break;
    }
  }

  return filteredSuggestions;
}
