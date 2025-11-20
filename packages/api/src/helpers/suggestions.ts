import type { db } from "@ssp/db/client";
import type {
  DayOfWeek,
  SessionType,
  WeeklyAvailability,
} from "@ssp/db/schema";
import { and, eq, getUserTimezone, sql } from "@ssp/db";
import { Availability, Profile, Session } from "@ssp/db/schema";

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
 * Configuration constants for the suggestion algorithm
 */
const SUGGESTION_CONFIG = {
  MIN_PATTERN_FREQUENCY: 2, // Minimum occurrences to consider a pattern
  MIN_SPACING_HOURS: 2, // Minimum hours between sessions
  IDEAL_SPACING_HOURS: 4, // Ideal spacing between sessions
  MAX_HIGH_PRIORITY_PER_DAY: 2, // Max high-priority (4-5) sessions per day
  MAX_TOTAL_SESSIONS_PER_DAY: 4, // Max total sessions per day
  HIGH_PRIORITY_THRESHOLD: 4, // Priority >= this is considered "high priority"
  FATIGUE_PENALTY_PER_HIGH_PRIORITY: 15, // Score penalty per high-priority session on same day
  DEFAULT_DURATION_MINUTES: 60,
  DEFAULT_PRIORITY: 3,
  MAX_SUGGESTIONS: 15, // Maximum number of suggestions to return
} as const;

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
    const roundedMinute = minute < 30 ? 0 : 30;

    const durationMinutes = Math.round(
      (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60),
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
    .filter((p) => p.frequency >= SUGGESTION_CONFIG.MIN_PATTERN_FREQUENCY)
    .map(({ completedCount, ...pattern }) => pattern) // Remove completedCount from output
    .sort((a, b) => {
      // Sort by success rate first (higher is better), then frequency
      if (Math.abs(a.successRate - b.successRate) > 0.1) {
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
  userTimezone: string,
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
    (s) => s.priority >= SUGGESTION_CONFIG.HIGH_PRIORITY_THRESHOLD,
  ).length;

  // Penalty for too many high-priority sessions
  if (highPriorityCount > SUGGESTION_CONFIG.MAX_HIGH_PRIORITY_PER_DAY) {
    const excess =
      highPriorityCount - SUGGESTION_CONFIG.MAX_HIGH_PRIORITY_PER_DAY;
    fatigueScore +=
      excess * SUGGESTION_CONFIG.FATIGUE_PENALTY_PER_HIGH_PRIORITY;
    reasons.push(
      `${highPriorityCount} high-priority sessions already scheduled (max ${SUGGESTION_CONFIG.MAX_HIGH_PRIORITY_PER_DAY})`,
    );
  }

  // Penalty for too many total sessions
  if (daySessions.length >= SUGGESTION_CONFIG.MAX_TOTAL_SESSIONS_PER_DAY) {
    fatigueScore += 30;
    reasons.push(
      `${daySessions.length} sessions already scheduled (max ${SUGGESTION_CONFIG.MAX_TOTAL_SESSIONS_PER_DAY})`,
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
  userTimezone: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 100;

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
      score -= 100; // Overlap penalty
      reasons.push("Overlaps with existing session");
      continue;
    }

    // Penalty for too close spacing
    if (hoursBefore >= 0 && hoursBefore < SUGGESTION_CONFIG.MIN_SPACING_HOURS) {
      const penalty = Math.round(
        (1 - hoursBefore / SUGGESTION_CONFIG.MIN_SPACING_HOURS) * 25,
      );
      score -= penalty;
      reasons.push(
        `Only ${Math.round(hoursBefore * 10) / 10}h after previous session`,
      );
    }
    if (hoursAfter >= 0 && hoursAfter < SUGGESTION_CONFIG.MIN_SPACING_HOURS) {
      const penalty = Math.round(
        (1 - hoursAfter / SUGGESTION_CONFIG.MIN_SPACING_HOURS) * 25,
      );
      score -= penalty;
      reasons.push(
        `Only ${Math.round(hoursAfter * 10) / 10}h before next session`,
      );
    }

    // Bonus for ideal spacing
    if (
      hoursBefore >= SUGGESTION_CONFIG.IDEAL_SPACING_HOURS &&
      hoursBefore < SUGGESTION_CONFIG.IDEAL_SPACING_HOURS + 2
    ) {
      score += 5;
      reasons.push("Good spacing from previous session");
    }
    if (
      hoursAfter >= SUGGESTION_CONFIG.IDEAL_SPACING_HOURS &&
      hoursAfter < SUGGESTION_CONFIG.IDEAL_SPACING_HOURS + 2
    ) {
      score += 5;
      reasons.push("Good spacing before next session");
    }

    // Extra penalty if both sessions are high priority and too close
    if (
      proposedPriority >= SUGGESTION_CONFIG.HIGH_PRIORITY_THRESHOLD &&
      session.priority >= SUGGESTION_CONFIG.HIGH_PRIORITY_THRESHOLD &&
      (hoursBefore < SUGGESTION_CONFIG.IDEAL_SPACING_HOURS ||
        hoursAfter < SUGGESTION_CONFIG.IDEAL_SPACING_HOURS)
    ) {
      score -= 15;
      reasons.push("High-priority sessions too close together");
    }
  }

  // Check spacing from other suggestions
  for (const suggestion of otherSuggestions) {
    const hoursBefore = hoursBetween(proposedStart, suggestion.endTime);
    const hoursAfter = hoursBetween(suggestion.startTime, proposedEnd);

    if (hoursBefore >= 0 && hoursBefore < 1) {
      score -= 40; // Heavy penalty for consecutive suggestions
      reasons.push("Too close to another suggestion");
    }
    if (hoursAfter >= 0 && hoursAfter < 1) {
      score -= 40;
      reasons.push("Too close to another suggestion");
    }
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
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
    const defaultPriority = SUGGESTION_CONFIG.DEFAULT_PRIORITY;
    if (options.minPriority && defaultPriority < options.minPriority) continue;
    if (options.maxPriority && defaultPriority > options.maxPriority) continue;

    let found = false;
    const today = new Date(startDate);
    today.setHours(0, 0, 0, 0);

    // Try to distribute suggestions across different days
    for (let dayOffset = typeIndex; dayOffset < lookAheadDays; dayOffset += 3) {
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
      if (fatigue.fatigueScore > 50) continue; // Skip days with high fatigue

      for (const window of windowsForDay) {
        if (found) break;

        const windowStartMinutes = timeToMinutes(window.startTime);
        const windowEndMinutes = timeToMinutes(window.endTime);
        const durationMinutes = SUGGESTION_CONFIG.DEFAULT_DURATION_MINUTES;

        if (windowEndMinutes - windowStartMinutes < durationMinutes) {
          continue;
        }

        // Try middle of window for better distribution
        const slotStartMinutes =
          windowStartMinutes +
          Math.floor(
            (windowEndMinutes - windowStartMinutes - durationMinutes) / 2,
          );

        const slotStartHours = Math.floor(slotStartMinutes / 60);
        const slotStartMins = slotStartMinutes % 60;

        const slotStart = convertLocalTimeToUTC(
          candidateDate,
          slotStartHours,
          slotStartMins,
          userTimezone,
        );

        const slotEnd = new Date(slotStart);
        slotEnd.setTime(slotEnd.getTime() + durationMinutes * 60 * 1000);

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
        } catch {
          continue;
        }

        if (conflicts.length > 0) {
          continue;
        }

        // Check spacing from other suggestions
        const tooClose = suggestions.some((existing) => {
          const hoursDiff = hoursBetween(slotStart, existing.startTime);
          return hoursDiff < SUGGESTION_CONFIG.MIN_SPACING_HOURS;
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
          score: 50 + Math.floor(spacingResult.score / 2), // Base score + spacing
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
  const lookAheadDays = options.lookAheadDays ?? 14;

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
      weekOffset < Math.ceil(lookAheadDays / 7);
      weekOffset++
    ) {
      const candidateDate = new Date(windowDate);
      candidateDate.setDate(candidateDate.getDate() + weekOffset * 7);

      // Skip if beyond look-ahead period
      const daysFromStart = Math.floor(
        (candidateDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
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
      slotEnd.setTime(slotEnd.getTime() + pattern.durationMinutes * 60 * 1000);

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
      } catch {
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
      let score = 40; // Base score

      // Pattern frequency bonus (more frequent patterns score higher)
      const frequencyBonus = Math.min(pattern.frequency * 4, 25);
      score += frequencyBonus;
      reasons.push(
        `Based on ${pattern.frequency} previous ${SESSION_TYPE_LABELS[pattern.type]} session${pattern.frequency > 1 ? "s" : ""}`,
      );

      // Success rate bonus (patterns with high completion rate score higher)
      const successBonus = Math.round(pattern.successRate * 15);
      score += successBonus;
      if (pattern.successRate > 0.8) {
        reasons.push("High completion rate for this pattern");
      }

      // Spacing score (weighted)
      score += Math.floor(spacingResult.score * 0.3); // 30% weight
      reasons.push(...spacingResult.reasons);

      // Fatigue penalty
      score -= fatigue.fatigueScore;
      reasons.push(...fatigue.reasons);

      // Bonus for earlier dates (sooner is better, but not too much)
      const daysFromNow = Math.floor(
        (slotStart.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysFromNow <= 3) {
        score += 5; // Small bonus for near-term slots
        reasons.push("Available soon");
      }

      // Priority bonus (higher priority patterns get slight bonus, but fatigue already penalizes clustering)
      if (pattern.priority >= SUGGESTION_CONFIG.HIGH_PRIORITY_THRESHOLD) {
        score += 3;
      }

      // Ensure score is within bounds
      score = Math.max(0, Math.min(100, score));

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
      return hoursDiff < SUGGESTION_CONFIG.MIN_SPACING_HOURS;
    });

    if (!tooClose) {
      filteredSuggestions.push(suggestion);
    }

    // Limit total suggestions
    if (filteredSuggestions.length >= SUGGESTION_CONFIG.MAX_SUGGESTIONS) {
      break;
    }
  }

  return filteredSuggestions;
}
