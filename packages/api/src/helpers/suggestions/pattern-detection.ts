import type { DayOfWeek, SessionType } from "@ssp/db/schema";

import { SUGGESTION_CONSTANTS } from "../../utils/constants";

/**
 * Pattern detected from past sessions
 */
export interface SessionPattern {
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
export function detectPatterns(
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

  if (filteredSessions.length === 0) {
    return [];
  }

  // Create formatter once outside loop for performance
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: userTimezone,
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  // Group sessions by pattern key: type + dayOfWeek + hour
  const patternMap = new Map<string, SessionPattern>();

  for (const session of filteredSessions) {
    // Get day of week and time in user's timezone
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
    const roundedMinute =
      minute < SUGGESTION_CONSTANTS.MINUTE_ROUNDING_INTERVAL
        ? 0
        : SUGGESTION_CONSTANTS.MINUTE_ROUNDING_INTERVAL;

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
    .filter((p) => p.frequency >= SUGGESTION_CONSTANTS.MIN_PATTERN_FREQUENCY)
    .sort((a, b) => b.frequency - a.frequency);
}
