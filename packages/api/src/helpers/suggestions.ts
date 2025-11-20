import type { db } from "@ssp/db/client";
import type { DayOfWeek, SessionType } from "@ssp/db/schema";
import { and, eq, getUserTimezone, sql } from "@ssp/db";
import { Availability, Profile, Session } from "@ssp/db/schema";

import {
  convertLocalTimeToUTC,
  getDateForDayOfWeek,
  timeToMinutes,
} from "../utils/date";
import { checkSessionConflicts } from "./session";

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
}

/**
 * Analyze past sessions to detect repeating patterns
 * Groups sessions by type, day of week, and time of day
 */
function detectPatterns(
  sessions: {
    type: SessionType;
    title: string;
    startTime: Date;
    endTime: Date;
    priority: number;
  }[],
  userTimezone: string,
): SessionPattern[] {
  // Filter out CLIENT_MEETING sessions
  const filteredSessions = sessions.filter((s) => s.type !== "CLIENT_MEETING");

  // Group sessions by pattern key: type + dayOfWeek + hour
  const patternMap = new Map<string, SessionPattern>();

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

    // Round hour to nearest hour for pattern matching (allows some flexibility)
    const roundedHour = hour;
    const roundedMinute = minute < 30 ? 0 : 30; // Round to nearest 30 minutes

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
        title: session.title,
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
        // Use most common title
        if (session.title === pattern.title) {
          // Keep current title if it matches
        } else {
          // Could track title frequency, but for now keep first one
        }
      }
    }
  }

  // Return patterns sorted by frequency (most common first)
  return Array.from(patternMap.values())
    .filter((p) => p.frequency >= 2) // Only include patterns that occurred at least twice
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Calculate spacing score for a time slot
 * Penalizes clustering and rewards good spacing
 */
function calculateSpacingScore(
  proposedStart: Date,
  proposedEnd: Date,
  existingSessions: { startTime: Date; endTime: Date }[],
  otherSuggestions: SuggestedSession[],
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 100;

  // Check sessions on the same day
  const sameDaySessions = existingSessions.filter((session) => {
    const sessionDate = new Date(session.startTime);
    const proposedDate = new Date(proposedStart);
    return (
      sessionDate.getUTCFullYear() === proposedDate.getUTCFullYear() &&
      sessionDate.getUTCMonth() === proposedDate.getUTCMonth() &&
      sessionDate.getUTCDate() === proposedDate.getUTCDate()
    );
  });

  // Check spacing between sessions (prefer at least 2 hours between sessions)
  const minSpacingHours = 2;
  for (const session of sameDaySessions) {
    const hoursBefore =
      (proposedStart.getTime() - session.endTime.getTime()) / (1000 * 60 * 60);
    const hoursAfter =
      (session.startTime.getTime() - proposedEnd.getTime()) / (1000 * 60 * 60);

    if (hoursBefore >= 0 && hoursBefore < minSpacingHours) {
      const penalty = Math.round((1 - hoursBefore / minSpacingHours) * 20);
      score -= penalty;
      reasons.push(
        `Only ${Math.round(hoursBefore * 10) / 10}h after previous session`,
      );
    }
    if (hoursAfter >= 0 && hoursAfter < minSpacingHours) {
      const penalty = Math.round((1 - hoursAfter / minSpacingHours) * 20);
      score -= penalty;
      reasons.push(
        `Only ${Math.round(hoursAfter * 10) / 10}h before next session`,
      );
    }
  }

  // Check spacing from other suggestions (prevent consecutive slots)
  for (const suggestion of otherSuggestions) {
    const hoursBefore =
      (proposedStart.getTime() - suggestion.endTime.getTime()) /
      (1000 * 60 * 60);
    const hoursAfter =
      (suggestion.startTime.getTime() - proposedEnd.getTime()) /
      (1000 * 60 * 60);

    // Strong penalty for overlapping or very close suggestions
    if (hoursBefore >= 0 && hoursBefore < 1) {
      score -= 50; // Heavy penalty for consecutive suggestions
      reasons.push("Too close to another suggestion");
    }
    if (hoursAfter >= 0 && hoursAfter < 1) {
      score -= 50;
      reasons.push("Too close to another suggestion");
    }
  }

  // Bonus for good spacing
  const hasGoodSpacing = sameDaySessions.every((session) => {
    const hoursBefore =
      (proposedStart.getTime() - session.endTime.getTime()) / (1000 * 60 * 60);
    const hoursAfter =
      (session.startTime.getTime() - proposedEnd.getTime()) / (1000 * 60 * 60);
    return (
      (hoursBefore < 0 || hoursBefore >= minSpacingHours) &&
      (hoursAfter < 0 || hoursAfter >= minSpacingHours)
    );
  });

  if (hasGoodSpacing && sameDaySessions.length > 0) {
    score += 10;
    reasons.push("Good spacing from other sessions");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/**
 * Generate default suggestions when no patterns are detected
 * Creates 3 suggestions with different types, spread across availability windows
 */
async function generateDefaultSuggestions(
  database: typeof db,
  userId: string,
  weeklyAvailability: Record<string, { startTime: string; endTime: string }[]>,
  userTimezone: string,
  activeSessions: { startTime: Date; endTime: Date }[],
  startDate: Date,
  lookAheadDays: number,
): Promise<SuggestedSession[]> {
  // Default session types (excluding CLIENT_MEETING)
  const defaultTypes: SessionType[] = ["DEEP_WORK", "WORKOUT", "LANGUAGE"];

  const sessionTypeLabels: Record<SessionType, string> = {
    DEEP_WORK: "Deep Work",
    WORKOUT: "Workout",
    LANGUAGE: "Language",
    MEDITATION: "Meditation",
    CLIENT_MEETING: "Client Meeting",
    STUDY: "Study",
    READING: "Reading",
    OTHER: "Other",
  };

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

  const defaultDurationMinutes = 60;
  const defaultPriority = 3;
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

  // Generate 3 default suggestions, one for each type
  for (let i = 0; i < Math.min(3, defaultTypes.length); i++) {
    const type = defaultTypes[i];
    if (!type) continue;
    const title = sessionTypeLabels[type];

    // Start from today and iterate through days
    let found = false;
    const today = new Date(startDate);
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < lookAheadDays; dayOffset++) {
      if (found) break;

      const candidateDate = new Date(today);
      candidateDate.setDate(candidateDate.getDate() + dayOffset);

      // Get the day of week for this date
      const candidateDayOfWeek = getDayOfWeekFromDate(candidateDate);

      // Find availability windows for this day of week
      const windowsForDay = availabilityWindows.filter(
        (w) => w.dayOfWeek === candidateDayOfWeek,
      );

      // Try each availability window for this day
      for (const window of windowsForDay) {
        if (found) break;

        // Parse window times
        const windowStartMinutes = timeToMinutes(window.startTime);
        const windowEndMinutes = timeToMinutes(window.endTime);

        // Check if window is long enough
        if (windowEndMinutes - windowStartMinutes < defaultDurationMinutes) {
          continue;
        }

        // Try different times within the window (morning, afternoon, evening)
        // Distribute suggestions across different times
        const timeSlots = [
          windowStartMinutes + 60, // 1 hour after window start
          windowStartMinutes +
            Math.floor((windowEndMinutes - windowStartMinutes) / 2), // Middle of window
          windowEndMinutes - defaultDurationMinutes - 60, // 1 hour before window end
        ].filter(
          (minutes) =>
            minutes >= windowStartMinutes &&
            minutes + defaultDurationMinutes <= windowEndMinutes,
        );

        for (const slotStartMinutes of timeSlots) {
          if (found) break;

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
            slotEnd.getTime() + defaultDurationMinutes * 60 * 1000,
          );

          // Skip if in the past
          if (slotStart < new Date()) {
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

          // Check spacing from other suggestions (prevent consecutive slots)
          const tooClose = suggestions.some((existing) => {
            const hoursDiff = Math.abs(
              (slotStart.getTime() - existing.startTime.getTime()) /
                (1000 * 60 * 60),
            );
            return hoursDiff < 2; // Minimum 2 hours spacing
          });

          if (tooClose) {
            continue;
          }

          // Found a valid slot
          suggestions.push({
            title,
            type,
            startTime: slotStart,
            endTime: slotEnd,
            priority: defaultPriority,
            description: undefined,
            score: 60, // Default score
            reasons: ["Default suggestion to get you started"],
          });

          found = true;
        }
      }
    }
  }

  return suggestions;
}

/**
 * Generate smart time slot suggestions based on repeating task patterns
 * This algorithm:
 * - Analyzes past sessions to detect repeating patterns (type, day, time)
 * - Generates suggestions based on these patterns
 * - Prevents consecutive slot suggestions
 * - Ignores CLIENT_MEETING sessions
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

  // Get user's availability (JSON structure)
  const availability = await database.query.Availability.findFirst({
    where: eq(Availability.userId, userId),
  });

  if (!availability?.weeklyAvailability) {
    // No availability set, return empty suggestions
    return [];
  }

  // Get all past completed sessions to detect patterns (excluding deleted sessions)
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
    })),
    userTimezone,
  );

  // Get existing sessions for conflict checking
  const activeSessions = allSessions.filter((s) => !s.completed);

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
      activeSessions.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      startDate,
      lookAheadDays,
    );
  }

  // Get session type display labels
  const sessionTypeLabels: Record<SessionType, string> = {
    DEEP_WORK: "Deep Work",
    WORKOUT: "Workout",
    LANGUAGE: "Language",
    MEDITATION: "Meditation",
    CLIENT_MEETING: "Client Meeting",
    STUDY: "Study",
    READING: "Reading",
    OTHER: "Other",
  };

  const suggestions: SuggestedSession[] = [];

  // Generate suggestions based on detected patterns
  for (const pattern of patterns) {
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
        // If conflict check fails, skip this slot
        continue;
      }

      if (conflicts.length > 0) {
        continue; // Skip conflicting slots
      }

      // Calculate scores
      const reasons: string[] = [];
      let score = 50; // Base score

      // Pattern frequency bonus (more frequent patterns score higher)
      const frequencyBonus = Math.min(pattern.frequency * 5, 30);
      score += frequencyBonus;
      reasons.push(
        `Based on ${pattern.frequency} previous ${sessionTypeLabels[pattern.type]} session${pattern.frequency > 1 ? "s" : ""}`,
      );

      // Spacing score (check against existing sessions and other suggestions)
      const spacingResult = calculateSpacingScore(
        slotStart,
        slotEnd,
        activeSessions.map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        suggestions, // Pass existing suggestions to prevent consecutive slots
      );
      score += spacingResult.score - 100; // spacingResult.score is 0-100, we want to add/subtract from base
      reasons.push(...spacingResult.reasons);

      // Bonus for earlier dates (sooner is better, but not too much)
      const daysFromNow = Math.floor(
        (slotStart.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysFromNow <= 3) {
        score += 5; // Small bonus for near-term slots
        reasons.push("Available soon");
      }

      // Ensure score is within bounds
      score = Math.max(0, Math.min(100, score));

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

  // Filter out consecutive suggestions (prevent listing every slot after the other)
  const filteredSuggestions: SuggestedSession[] = [];
  const minSpacingHours = 2; // Minimum spacing between suggestions

  for (const suggestion of sortedSuggestions) {
    // Check if this suggestion is too close to any already selected suggestion
    const tooClose = filteredSuggestions.some((existing) => {
      const hoursDiff = Math.abs(
        (suggestion.startTime.getTime() - existing.startTime.getTime()) /
          (1000 * 60 * 60),
      );
      return hoursDiff < minSpacingHours;
    });

    if (!tooClose) {
      filteredSuggestions.push(suggestion);
    }

    // Limit total suggestions
    if (filteredSuggestions.length >= 10) {
      break;
    }
  }

  return filteredSuggestions;
}
