import type { db } from "@ssp/db/client";
import type { DayOfWeek, SessionType } from "@ssp/db/schema";
import { eq, getUserTimezone } from "@ssp/db";
import { Availability, DAYS_OF_WEEK, Profile, Session } from "@ssp/db/schema";

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
  type: SessionType;
  durationMinutes: number; // Duration of the session in minutes
  priority: number; // Priority level 1-5
  startDate?: Date; // Start looking from this date (default: now)
  lookAheadDays?: number; // How many days ahead to look (default: 14)
  preferredTimes?: {
    // Optional: preferred time windows (in user's timezone)
    startHour?: number; // 0-23
    endHour?: number; // 0-23
  };
}

// TODO: FIXME: suggestions can overlap with each other, we need to prevent this
// Establish a window of available slots then, generate a suggestion then remove the slots from the windo, reeat
// Prevent too many suggestions of the same type, making the suggestions irrelevant
// Could use a priority queue to keep track of the best suggestions
// Generate suggestion on event (e.g. user accepts a suggestion, user creates a session, user adjusts a session)
// Generate suggestions periodically and use an actual table to store the suggestions (scale issues?)

/**
 * Calculate spacing/fatigue score for a time slot
 * Penalizes clustering of high-priority sessions
 */
function calculateSpacingScore(
  proposedStart: Date,
  proposedEnd: Date,
  existingSessions: { startTime: Date; endTime: Date; priority: number }[],
  priority: number,
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

  // Count high-priority sessions (priority >= 4) on the same day
  const highPriorityCount = sameDaySessions.filter(
    (s) => s.priority >= 4,
  ).length;
  if (priority >= 4) {
    // If this is also high-priority, check if we're clustering too many
    if (highPriorityCount >= 2) {
      score -= 30;
      reasons.push("Too many high-priority sessions already scheduled today");
    } else if (highPriorityCount === 1) {
      score -= 15;
      reasons.push("One high-priority session already scheduled today");
    }
  }

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
 * Calculate priority-based score
 * Higher priority sessions get preference for better time slots
 */
function calculatePriorityScore(priority: number): number {
  // Priority 5 gets +20, Priority 4 gets +10, Priority 3 gets 0, etc.
  return (priority - 3) * 10;
}

/**
 * Calculate preferred time score
 */
function calculatePreferredTimeScore(
  hour: number,
  preferredTimes?: { startHour?: number; endHour?: number },
): number {
  const startHour = preferredTimes?.startHour;
  const endHour = preferredTimes?.endHour;
  if (startHour === undefined || endHour === undefined) {
    return 0;
  }

  // Check if the hour falls within preferred range
  if (hour >= startHour && hour < endHour) {
    return 15; // Bonus for preferred time
  }

  // Partial bonus for nearby times
  const distance = Math.min(
    Math.abs(hour - startHour),
    Math.abs(hour - endHour),
  );
  if (distance <= 2) {
    return 10 - distance * 2;
  }

  return 0;
}

/**
 * Generate smart time slot suggestions for a session
 * This is a non-trivial algorithm that considers:
 * - User availability windows
 * - Existing sessions (avoids conflicts)
 * - Priority (higher priority gets better slots)
 * - Spacing/fatigue heuristic (avoids clustering high-priority sessions)
 */
export async function suggestTimeSlots(
  database: typeof db,
  userId: string,
  options: SuggestionOptions,
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

  // Convert JSON structure to array format for processing
  const availabilityWindows: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }[] = [];

  for (const [dayOfWeek, windows] of Object.entries(
    availability.weeklyAvailability,
  )) {
    for (const window of windows) {
      availabilityWindows.push({
        dayOfWeek,
        startTime: window.startTime,
        endTime: window.endTime,
      });
    }
  }

  // Sort by day of week and start time
  const dayOrder: Record<string, number> = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
    SUNDAY: 6,
  };

  availabilityWindows.sort((a, b) => {
    const dayDiff =
      (dayOrder[a.dayOfWeek] ?? 99) - (dayOrder[b.dayOfWeek] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  // Get existing sessions for conflict checking
  const existingSessions = await database.query.Session.findMany({
    where: eq(Session.userId, userId),
  });

  // Filter to only non-completed sessions for conflict/spacing checks
  const activeSessions = existingSessions.filter((s) => !s.completed);

  // Set defaults
  const startDate = options.startDate ?? new Date();
  const lookAheadDays = options.lookAheadDays ?? 14;

  // Get session type display label for title
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
  const defaultTitle = sessionTypeLabels[options.type];

  const suggestions: SuggestedSession[] = [];

  // Generate candidate slots for each availability window
  for (const window of availabilityWindows) {
    // Validate and cast dayOfWeek to DayOfWeek type
    if (!DAYS_OF_WEEK.includes(window.dayOfWeek as DayOfWeek)) {
      continue; // Skip invalid day of week
    }
    const dayOfWeek = window.dayOfWeek as DayOfWeek;

    // Calculate dates for this day of week within the look-ahead period
    const windowDate = getDateForDayOfWeek(startDate, dayOfWeek, userTimezone);

    // Generate slots for each week in the look-ahead period
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

      // Parse availability window times
      const windowStartMinutes = timeToMinutes(window.startTime);
      const windowEndMinutes = timeToMinutes(window.endTime);
      const windowDuration = windowEndMinutes - windowStartMinutes;

      // Check if window is long enough
      if (windowDuration < options.durationMinutes) {
        continue;
      }

      // Generate candidate slots within this window
      // Try slots at 30-minute intervals, starting from window start
      const slotInterval = 30; // minutes
      for (
        let slotStartMinutes = windowStartMinutes;
        slotStartMinutes + options.durationMinutes <= windowEndMinutes;
        slotStartMinutes += slotInterval
      ) {
        // Convert local time (in user's timezone) to UTC Date
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
          slotEnd.getTime() + options.durationMinutes * 60 * 1000,
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
          // If conflict check fails, skip this slot
          continue;
        }

        if (conflicts.length > 0) {
          continue; // Skip conflicting slots
        }

        // Calculate scores
        const reasons: string[] = [];
        let score = 50; // Base score

        // Priority score
        const priorityScore = calculatePriorityScore(options.priority);
        score += priorityScore;
        if (priorityScore > 0) {
          reasons.push(`High priority (${options.priority})`);
        }

        // Spacing/fatigue score
        const spacingResult = calculateSpacingScore(
          slotStart,
          slotEnd,
          activeSessions.map((s) => ({
            startTime: s.startTime,
            endTime: s.endTime,
            priority: s.priority,
          })),
          options.priority,
        );
        score += spacingResult.score - 100; // spacingResult.score is 0-100, we want to add/subtract from base
        reasons.push(...spacingResult.reasons);

        // Preferred time score
        const hourInTimezone = new Intl.DateTimeFormat("en-US", {
          timeZone: userTimezone,
          hour: "numeric",
          hour12: false,
        }).formatToParts(slotStart);
        const hour = Number.parseInt(
          hourInTimezone.find((p) => p.type === "hour")?.value ?? "12",
          10,
        );
        const preferredScore = calculatePreferredTimeScore(
          hour,
          options.preferredTimes,
        );
        score += preferredScore;
        if (preferredScore > 0) {
          reasons.push("Within preferred time window");
        }

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
          title: defaultTitle,
          type: options.type,
          startTime: slotStart,
          endTime: slotEnd,
          priority: options.priority,
          description: undefined, // Can be filled by user when adjusting
          score,
          reasons: reasons.length > 0 ? reasons : ["Available slot"],
        });
      }
    }
  }

  // Sort by score (highest first) and return top suggestions
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 10); // Return top 10 suggestions
}
